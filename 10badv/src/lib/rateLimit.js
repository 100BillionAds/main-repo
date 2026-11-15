import { getFallbackStore, getStore } from '@/lib/kv';

/**
 * 요청 제한 (Rate Limit) — 고정 구간(fixed window) 방식
 *
 * "identifier 는 windowMs 동안 limit 번까지" 를 센다. 첫 요청 때 구간이 시작되고,
 * 구간이 끝나면 횟수가 0 으로 돌아간다.
 *
 * 횟수는 키-값 저장소에 둔다.
 *  - Redis 가 있으면: 서버가 여러 대여도 한 곳에서 세므로 정확하다. 증가와 만료 설정은 원자적으로 실행된다
 *    (lib/kv/redisStore.js 의 Lua 스크립트).
 *  - Redis 가 없거나 장애면: 이 서버의 메모리로 센다. 서버마다 따로 세게 되어 느슨해지지만,
 *    제한이 아예 사라지거나 모든 요청이 막히는 것보다 낫다.
 */

/**
 * 한 번 사용한 것으로 세고, 허용 여부를 돌려준다.
 * @param {string} identifier 무엇을 기준으로 셀지 (예: "register:1.2.3.4", "ai:draft:42")
 * @returns {Promise<{ success: boolean, remaining: number, reset: number }>} reset 은 구간이 끝나는 시각(ms)
 */
export async function rateLimit(identifier, { limit = 20, windowMs = 60 * 1000, store, now = Date.now } = {}) {
  const key = `tenbadv:rl:${identifier}`;
  let result;
  try {
    result = await (store || getStore()).incrementWithExpiry(key, windowMs);
  } catch (error) {
    console.error('요청 제한 저장소 오류 (메모리로 대신 셉니다):', error.message);
    result = await getFallbackStore().incrementWithExpiry(key, windowMs);
  }

  return {
    success: result.count <= limit,
    remaining: Math.max(0, limit - result.count),
    reset: now() + result.ttlMs,
  };
}

/**
 * API 라우트에서 Rate Limit 체크 헬퍼
 * @param {Request} request
 * @param {object} options
 * @returns {Promise<{ allowed: boolean, headers: object }>}
 */
export async function checkRateLimit(request, options = {}) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const { success, remaining, reset } = await rateLimit(`${options.name || 'ip'}:${ip}`, options);

  const headers = {
    'X-RateLimit-Limit': String(options.limit || 20),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
  };

  return { allowed: success, headers };
}
