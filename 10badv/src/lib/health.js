import { query, getMigrationStatus } from '@/lib/db';
import { getRedis } from '@/lib/redis';
import { MAX_ATTEMPTS } from '@/domain/events/outboxRepository';

/**
 * 상태 점검
 *
 * 두 가지를 구분한다.
 *  - 살아 있는가 (liveness)  : /api/health        프로세스가 응답하는가. 아무것도 확인하지 않는다.
 *  - 일할 수 있는가 (readiness): /api/health/ready  DB·Redis·이벤트 처리가 정상인가.
 *
 * 배포 플랫폼의 헬스 체크에는 앞의 것을 쓴다. 뒤의 것을 쓰면 Redis 가 잠깐 끊겼을 때
 * 플랫폼이 멀쩡한 서버를 "죽었다"고 보고 재시작해, 작은 장애를 큰 장애로 만든다.
 */
const CHECK_TIMEOUT_MS = 2000;
const OUTBOX_STALE_MINUTES = 15;

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} 응답 없음 (${CHECK_TIMEOUT_MS}ms)`)), CHECK_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function run(label, check) {
  const startedAt = Date.now();
  try {
    const detail = await withTimeout(check(), label);
    return { status: 'ok', latencyMs: Date.now() - startedAt, ...detail };
  } catch (error) {
    console.error(`상태 점검 실패 (${label}):`, error.message);
    // 원인은 서버 로그에만 남긴다. 공개 응답에는 내부 주소·오류 문구를 싣지 않는다.
    return { status: 'down', latencyMs: Date.now() - startedAt };
  }
}

async function checkDatabase() {
  await query('SELECT 1');
  return {};
}

async function checkMigrations() {
  const status = await getMigrationStatus();
  const pending = status.filter((item) => !item.applied).length;
  const mismatched = status.filter((item) => item.applied && item.checksumMatches === false).length;
  if (pending > 0 || mismatched > 0) {
    return { status: 'degraded', pending, mismatched };
  }
  return { applied: status.length };
}

async function checkRedis() {
  const redis = getRedis();
  if (!redis) return { status: 'disabled' }; // REDIS_URL 없음: 메모리로 동작 중 (정상적인 구성)
  await redis.ping();
  return {};
}

async function checkOutbox() {
  const [row] = await query(
    `SELECT
        SUM(processed_at IS NULL AND attempts < ?) AS pending,
        SUM(processed_at IS NULL AND attempts >= ?) AS dead,
        SUM(processed_at IS NULL AND attempts < ? AND created_at < NOW() - INTERVAL ? MINUTE) AS stale
       FROM outbox_events`,
    [MAX_ATTEMPTS, MAX_ATTEMPTS, MAX_ATTEMPTS, OUTBOX_STALE_MINUTES]
  );
  const pending = Number(row?.pending || 0);
  const dead = Number(row?.dead || 0);
  const stale = Number(row?.stale || 0);
  // 오래 밀린 이벤트나 포기한 이벤트가 있으면 알림이 안 나가고 있다는 뜻이다.
  return { ...(dead > 0 || stale > 0 ? { status: 'degraded' } : {}), pending, stale, dead };
}

/**
 * 구성 요소별 결과를 하나의 상태로 요약한다 (순수 함수).
 *  - DB 가 죽었으면 down: 서비스가 일할 수 없다.
 *  - 그 밖의 문제는 degraded: 일은 하지만 일부 기능이 느슨해지거나 밀린다.
 */
export function summarizeHealth(checks) {
  if (checks.database?.status !== 'ok') return 'down';
  const others = Object.entries(checks).filter(([name]) => name !== 'database');
  return others.some(([, check]) => check.status === 'down' || check.status === 'degraded') ? 'degraded' : 'ok';
}

export async function checkReadiness() {
  const database = await run('database', checkDatabase);
  // DB 가 죽었으면 DB 를 쓰는 점검은 건너뛴다.
  const dbDown = database.status !== 'ok';
  const [migrations, redis, outbox] = await Promise.all([
    dbDown ? { status: 'skipped' } : run('migrations', checkMigrations),
    run('redis', checkRedis),
    dbDown ? { status: 'skipped' } : run('outbox', checkOutbox),
  ]);

  const checks = { database, migrations, redis, outbox };
  return { status: summarizeHealth(checks), checks };
}
