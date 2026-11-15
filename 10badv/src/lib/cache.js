import { getStore } from '@/lib/kv';

/**
 * 캐시 (cache-aside 패턴)
 *
 *   1. 캐시에서 찾는다 → 있으면 그대로 쓴다 (hit)
 *   2. 없으면 원래 작업을 하고 (miss)
 *   3. 결과를 캐시에 넣어 둔다
 *
 * 캐시는 속도를 위한 것이지 정답의 원본이 아니다. 그래서:
 *  - 반드시 만료 시간(TTL)을 건다. 영원히 남는 캐시는 언젠가 틀린 값이 된다.
 *  - 캐시가 실패하면(연결 끊김, 깨진 값) 없는 셈 치고 원래 작업을 한다. 캐시 장애가 서비스 장애가 되면 안 된다.
 */
const PREFIX = 'tenbadv:cache:';

export function createCache({ store = getStore, onError = (error) => console.error('캐시 오류:', error.message) } = {}) {
  const resolve = () => (typeof store === 'function' ? store() : store);

  return {
    /** 없거나 읽지 못하면 null */
    async get(key) {
      try {
        const raw = await resolve().get(PREFIX + key);
        return raw === null || raw === undefined ? null : JSON.parse(raw);
      } catch (error) {
        onError(error);
        return null;
      }
    },

    /** 저장에 실패해도 예외를 던지지 않는다. ttlSeconds 가 0 이하면 저장하지 않는다. */
    async set(key, value, ttlSeconds) {
      if (!(ttlSeconds > 0)) return;
      try {
        await resolve().set(PREFIX + key, JSON.stringify(value), Math.floor(ttlSeconds));
      } catch (error) {
        onError(error);
      }
    },
  };
}

export const cache = createCache();
