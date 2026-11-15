/** @jest-environment node */

/**
 * Redis 통합 테스트 (실제 Redis 필요: TEST_REDIS_URL)
 *
 * Lua 스크립트의 원자성, 만료, 여러 "서버"가 한 Redis 를 공유할 때의 동작처럼
 * 메모리 저장소로는 확인할 수 없는 것을 검증한다.
 * 로컬에 Redis 가 없으면 건너뛴다. CI 에서는 반드시 실행된다.
 */

const TEST_REDIS_URL = process.env.TEST_REDIS_URL;
if (process.env.CI && !TEST_REDIS_URL) {
  throw new Error('CI 에서는 TEST_REDIS_URL 이 필요합니다.');
}
// 이 파일에서만 Redis 를 켠다. 다른 테스트 파일은 메모리 저장소를 쓴다.
if (TEST_REDIS_URL) process.env.REDIS_URL = TEST_REDIS_URL;

const Redis = require('ioredis');
const { getRedis, closeRedis, redisReady } = require('@/lib/redis');
const { getStore } = require('@/lib/kv');
const { createRedisStore } = require('@/lib/kv/redisStore');
const { createCache } = require('@/lib/cache');
const { rateLimit } = require('@/lib/rateLimit');

jest.setTimeout(30000);

const SUFFIX = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const describeWithRedis = TEST_REDIS_URL ? describe : describe.skip;

describeWithRedis('Redis', () => {
  let secondServer;

  beforeAll(async () => {
    // 같은 Redis 에 붙은 "두 번째 서버" 역할의 별도 연결
    secondServer = new Redis(TEST_REDIS_URL);
    await redisReady();
    expect(await getRedis().ping()).toBe('PONG');
  });

  afterAll(async () => {
    await secondServer.quit();
    await closeRedis();
  });

  it('REDIS_URL 이 있으면 기본 저장소가 Redis 다', () => {
    expect(getStore().kind).toBe('redis');
  });

  it('캐시: 넣은 값을 꺼내고, 만료 시간이 지나면 사라진다', async () => {
    const cache = createCache();
    const key = `it:${SUFFIX}`;

    await cache.set(key, { text: '안녕하세요', tokens: 12 }, 1);
    expect(await cache.get(key)).toEqual({ text: '안녕하세요', tokens: 12 });

    await sleep(1300);
    expect(await cache.get(key)).toBeNull();
  });

  it('요청 제한: 두 서버에서 동시에 50번 요청해도 정확히 한도(10)만큼만 통과한다', async () => {
    const otherStore = createRedisStore(secondServer);
    const id = `it-burst:${SUFFIX}`;

    const results = await Promise.all(
      Array.from({ length: 50 }, (_unused, index) =>
        rateLimit(id, { limit: 10, windowMs: 5000, ...(index % 2 ? { store: otherStore } : {}) })
      )
    );

    expect(results.filter((result) => result.success)).toHaveLength(10);
  });

  it('요청 제한: 횟수 키에는 반드시 만료가 걸리고, 구간이 끝나면 다시 허용한다', async () => {
    const id = `it-window:${SUFFIX}`;

    expect((await rateLimit(id, { limit: 1, windowMs: 800 })).success).toBe(true);
    expect((await rateLimit(id, { limit: 1, windowMs: 800 })).success).toBe(false);

    // 만료 없는 키가 남으면 사용자가 영영 차단된다. PTTL 이 -1(만료 없음)이면 안 된다.
    const ttl = await secondServer.pttl(`tenbadv:rl:${id}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(800);

    await sleep(1000);
    expect((await rateLimit(id, { limit: 1, windowMs: 800 })).success).toBe(true);
  });

  it('만료 없이 남은 횟수 키가 있어도 다음 요청에서 만료를 다시 건다', async () => {
    const id = `it-orphan:${SUFFIX}`;
    await secondServer.set(`tenbadv:rl:${id}`, 5); // 만료 없는 키 (예전 방식의 사고를 재현)

    const result = await rateLimit(id, { limit: 3, windowMs: 2000 });

    expect(result.success).toBe(false);
    expect(await secondServer.pttl(`tenbadv:rl:${id}`)).toBeGreaterThan(0);
  });
});
