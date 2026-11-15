/**
 * 메모리 저장소. Redis 가 없을 때(로컬 개발, 테스트)와 Redis 장애 때의 대역.
 * 서버 한 대의 메모리에만 있으므로 서버가 여러 대면 서로 값을 보지 못하고, 재시작하면 사라진다.
 */
export function createMemoryStore({ now = Date.now, maxEntries = 5000 } = {}) {
  const entries = new Map(); // key → { value, expiresAt }

  function read(key) {
    const entry = entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now()) {
      entries.delete(key);
      return null;
    }
    return entry;
  }

  function write(key, value, expiresAt) {
    // 한도를 넘으면 만료된 것부터, 그래도 넘으면 가장 오래 전에 넣은 것부터 지운다 (메모리 누수 방지).
    if (!entries.has(key) && entries.size >= maxEntries) {
      for (const [candidate, entry] of entries) {
        if (entry.expiresAt <= now()) entries.delete(candidate);
      }
      while (entries.size >= maxEntries) {
        entries.delete(entries.keys().next().value);
      }
    }
    entries.set(key, { value, expiresAt });
  }

  return {
    kind: 'memory',

    async get(key) {
      return read(key)?.value ?? null;
    },

    async set(key, value, ttlSeconds) {
      write(key, String(value), now() + ttlSeconds * 1000);
    },

    async delete(key) {
      entries.delete(key);
    },

    /** 횟수를 1 올리고 현재 횟수와 남은 시간을 돌려준다. 첫 호출 때 windowMs 뒤로 만료를 건다. */
    async incrementWithExpiry(key, windowMs) {
      const entry = read(key);
      if (!entry) {
        write(key, 1, now() + windowMs);
        return { count: 1, ttlMs: windowMs };
      }
      entry.value += 1;
      return { count: entry.value, ttlMs: entry.expiresAt - now() };
    },
  };
}
