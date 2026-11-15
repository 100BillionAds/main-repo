/**
 * Redis 저장소. memoryStore 와 같은 메서드를 가진다.
 */

/**
 * "횟수 올리기 + 처음이면 만료 걸기"를 한 덩어리로 실행하는 Lua 스크립트.
 *
 * 왜 스크립트인가: INCR 과 EXPIRE 를 따로 보내면 그 사이에 서버가 죽었을 때 만료 없는 키가 남는다.
 * 그 사용자는 횟수가 영영 초기화되지 않아 계속 차단된다. Redis 는 스크립트 하나를 실행하는 동안
 * 다른 명령을 끼워 넣지 않으므로, 두 동작이 "전부 되거나 전혀 안 되거나"가 된다 (원자적).
 * 서버가 여러 대여도 횟수는 Redis 한 곳에서 세므로 정확하다.
 */
const INCREMENT_WITH_EXPIRY = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

export function createRedisStore(redis) {
  return {
    kind: 'redis',

    async get(key) {
      return redis.get(key);
    },

    async set(key, value, ttlSeconds) {
      await redis.set(key, String(value), 'EX', ttlSeconds);
    },

    async delete(key) {
      await redis.del(key);
    },

    async incrementWithExpiry(key, windowMs) {
      const [count, ttlMs] = await redis.eval(INCREMENT_WITH_EXPIRY, 1, key, windowMs);
      return { count: Number(count), ttlMs: Number(ttlMs) };
    },
  };
}
