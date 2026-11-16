/** @jest-environment node */

/**
 * 운영 기능 통합 테스트: 상태 점검, 정리 작업 (실제 MySQL / TiDB)
 */

const defaults = {
  DATABASE_HOST: '127.0.0.1',
  DATABASE_PORT: '3306',
  DATABASE_USER: 'root',
  DATABASE_PASSWORD: 'root',
  DATABASE_NAME: '10badv_test',
};
for (const [key, value] of Object.entries(defaults)) {
  if (process.env[key] === undefined) process.env[key] = value;
}
delete process.env.REDIS_URL;

const db = require('@/lib/db');
const { checkReadiness } = require('@/lib/health');
const { runCleanup } = require('@/domain/maintenance/cleanup');
const { GET: readyRoute } = require('@/app/api/health/ready/route');
const { relayOutbox } = require('@/lib/events/eventBus');

jest.setTimeout(60000);

const SUFFIX = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;

async function createUser() {
  const username = `ops_${SUFFIX}_${Math.floor(Math.random() * 100000)}`;
  const [result] = await db.default.execute(
    'INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)',
    [username, 'not-a-real-hash', username, `${username}@test.local`, 'user']
  );
  return result.insertId;
}

async function insertOutbox({ processedDaysAgo = null, attempts = 0, createdMinutesAgo = 0 }) {
  const [result] = await db.default.execute(
    `INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload, attempts, processed_at, enqueued_at, created_at)
     VALUES ('test.ops', 'test', 1, '{}', ?, ${processedDaysAgo === null ? 'NULL' : 'NOW() - INTERVAL ? DAY'}, NOW(), NOW() - INTERVAL ? MINUTE)`,
    processedDaysAgo === null ? [attempts, createdMinutesAgo] : [attempts, processedDaysAgo, createdMinutesAgo]
  );
  return result.insertId;
}

async function exists(table, id) {
  const [row] = await db.query(`SELECT COUNT(*) AS cnt FROM ${table} WHERE id = ?`, [id]);
  return Number(row.cnt) === 1;
}

describe('운영 기능', () => {
  beforeAll(async () => {
    expect(await db.initializeDatabase()).toBe(true);
    // 다른 테스트가 남긴 미처리 이벤트를 비워, 상태 점검이 깨끗한 상태에서 시작하게 한다.
    for (let round = 0; round < 50; round += 1) {
      if ((await relayOutbox({ limit: 500, requeueAfterSeconds: 0 })).claimed === 0) break;
    }
    await db.query("DELETE FROM outbox_events WHERE event_type = 'test.ops'");
  });

  afterAll(async () => {
    await db.query("DELETE FROM outbox_events WHERE event_type = 'test.ops'");
    await db.closeDatabasePool();
  });

  describe('상태 점검', () => {
    it('DB·마이그레이션이 정상이면 ok, Redis 를 쓰지 않으면 disabled 로 표시한다', async () => {
      const result = await checkReadiness();

      expect(result.checks.database.status).toBe('ok');
      expect(result.checks.migrations).toMatchObject({ status: 'ok' });
      expect(result.checks.migrations.applied).toBeGreaterThanOrEqual(4);
      expect(result.checks.redis.status).toBe('disabled');
      expect(result.checks.outbox).toMatchObject({ status: 'ok', stale: 0, dead: 0 });
      expect(result.status).toBe('ok');
    });

    it('오래 밀린 이벤트와 포기한 이벤트가 있으면 degraded 로 알린다', async () => {
      const staleId = await insertOutbox({ createdMinutesAgo: 60 });
      const deadId = await insertOutbox({ attempts: 10 });

      const response = await readyRoute();
      const body = await response.json();

      expect(response.status).toBe(200); // DB 는 살아 있으므로 503 이 아니다
      expect(body.status).toBe('degraded');
      expect(body.checks.outbox).toMatchObject({ status: 'degraded', stale: 1, dead: 1 });
      // 공개 응답에 내부 정보가 없다
      expect(JSON.stringify(body)).not.toMatch(/127\.0\.0\.1|password|root/i);

      await db.query('DELETE FROM outbox_events WHERE id IN (?, ?)', [staleId, deadId]);
    });
  });

  describe('정리 작업', () => {
    it('오래된 처리 완료 이벤트만 지운다 — 미처리 이벤트와 최근 것은 남긴다', async () => {
      const oldProcessed = await insertOutbox({ processedDaysAgo: 31 });
      const recentProcessed = await insertOutbox({ processedDaysAgo: 1 });
      const oldUnprocessed = await insertOutbox({ createdMinutesAgo: 60 * 24 * 40, attempts: 10 });

      const deleted = await runCleanup();

      expect(deleted.outbox).toBeGreaterThanOrEqual(1);
      expect(await exists('outbox_events', oldProcessed)).toBe(false);
      expect(await exists('outbox_events', recentProcessed)).toBe(true);
      expect(await exists('outbox_events', oldUnprocessed)).toBe(true);
    });

    it('오래전에 읽은 알림만 지운다 — 안 읽은 알림은 오래돼도 남긴다', async () => {
      const userId = await createUser();
      const insert = async (readSql, eventId) => {
        const [result] = await db.default.execute(
          `INSERT INTO notifications (user_id, type, title, event_id, read_at, created_at)
           VALUES (?, 'test.ops', '테스트', ?, ${readSql}, NOW() - INTERVAL 200 DAY)`,
          [userId, eventId]
        );
        return result.insertId;
      };
      const oldRead = await insert('NOW() - INTERVAL 91 DAY', -1);
      const recentRead = await insert('NOW() - INTERVAL 1 DAY', -2);
      const oldUnread = await insert('NULL', -3);

      await runCleanup();

      expect(await exists('notifications', oldRead)).toBe(false);
      expect(await exists('notifications', recentRead)).toBe(true);
      expect(await exists('notifications', oldUnread)).toBe(true);
    });

    it('오래된 AI 사용 기록을 지운다', async () => {
      const userId = await createUser();
      const insert = async (days) => {
        const [result] = await db.default.execute(
          `INSERT INTO ai_requests (user_id, feature, prompt_version, status, created_at)
           VALUES (?, 'test_ops', 'v1', 'success', NOW() - INTERVAL ? DAY)`,
          [userId, days]
        );
        return result.insertId;
      };
      const old = await insert(181);
      const recent = await insert(10);

      await runCleanup();

      expect(await exists('ai_requests', old)).toBe(false);
      expect(await exists('ai_requests', recent)).toBe(true);
    });
  });
});
