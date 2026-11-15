import Redis from 'ioredis';

/**
 * Redis 연결 (REDIS_URL 이 있을 때만).
 *
 * Redis 는 "있으면 좋은" 부품으로 다룬다. 캐시와 요청 제한은 Redis 가 없어도, 죽어도 서비스가 돌아가야 한다.
 *  - REDIS_URL 이 없으면 null 을 돌려주고, 호출하는 쪽은 메모리 저장소로 대신한다.
 *  - 연결이 끊긴 동안에는 명령을 쌓아 두지 않고 바로 실패시킨다 (enableOfflineQueue: false).
 *    쌓아 두면 Redis 가 돌아올 때까지 사용자 요청이 같이 멈춘다.
 *  - 명령 하나는 1초 안에 끝나야 한다 (commandTimeout). 캐시가 본 작업보다 느리면 캐시가 아니다.
 */
let client = null;
let lastErrorLogAt = 0;

export function getRedis() {
  if (!process.env.REDIS_URL) return null;
  if (client) return client;

  client = new Redis(process.env.REDIS_URL, {
    connectTimeout: 3000,
    commandTimeout: 1000,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    // 재연결 간격: 200ms 부터 늘려 최대 5초
    retryStrategy: (attempt) => Math.min(attempt * 200, 5000),
  });

  client.on('error', (error) => {
    // 끊긴 동안 재연결을 시도할 때마다 오류가 나므로, 로그는 30초에 한 번만 남긴다.
    const now = Date.now();
    if (now - lastErrorLogAt > 30000) {
      lastErrorLogAt = now;
      console.error('Redis 연결 오류:', error.message);
    }
  });

  return client;
}

/**
 * 연결이 준비될 때까지 기다린다 (테스트·스크립트용).
 * 서비스 코드는 기다리지 않는다 — 준비 전의 명령은 바로 실패하고, 호출한 쪽이 메모리로 대신한다.
 */
export async function redisReady(timeoutMs = 5000) {
  const redis = getRedis();
  if (!redis || redis.status === 'ready') return Boolean(redis);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Redis 연결 대기 시간 초과')), timeoutMs);
    redis.once('ready', () => {
      clearTimeout(timer);
      resolve();
    });
  });
  return true;
}

/** 테스트·스크립트 종료 시 연결 정리 */
export async function closeRedis() {
  if (!client) return;
  const closing = client;
  client = null;
  await closing.quit().catch(() => closing.disconnect());
}
