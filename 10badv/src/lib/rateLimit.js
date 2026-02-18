/**
 * 간단한 인메모리 Rate Limiter (Vercel Serverless 환경용)
 * 
 * 프로덕션 스케일링 시 Redis 기반으로 교체 권장 (upstash/ratelimit)
 * 현재는 서버리스 함수 인스턴스별 독립 카운트이므로 완벽하지 않지만,
 * 기본적인 abuse 방지에 효과적입니다.
 */

const rateLimitMap = new Map();

// 오래된 엔트리 자동 정리 (메모리 누수 방지)
const CLEANUP_INTERVAL = 60 * 1000; // 1분마다
let lastCleanup = Date.now();

function cleanup(windowMs) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, data] of rateLimitMap.entries()) {
    if (now - data.resetTime > windowMs * 2) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * Rate Limit 체크
 * @param {string} identifier - IP 또는 userId
 * @param {object} options
 * @param {number} options.limit - 허용 요청 수 (기본: 20)
 * @param {number} options.windowMs - 시간 윈도우 ms (기본: 60000 = 1분)
 * @returns {{ success: boolean, remaining: number, reset: number }}
 */
export function rateLimit(identifier, { limit = 20, windowMs = 60 * 1000 } = {}) {
  cleanup(windowMs);

  const now = Date.now();
  const key = identifier;
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  record.count++;

  if (record.count > limit) {
    return {
      success: false,
      remaining: 0,
      reset: record.resetTime,
    };
  }

  return {
    success: true,
    remaining: limit - record.count,
    reset: record.resetTime,
  };
}

/**
 * API 라우트에서 Rate Limit 체크 헬퍼
 * @param {Request} request
 * @param {object} options
 * @returns {{ allowed: boolean, response?: Response, headers: object }}
 */
export function checkRateLimit(request, options = {}) {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const { success, remaining, reset } = rateLimit(ip, options);

  const headers = {
    'X-RateLimit-Limit': String(options.limit || 20),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
  };

  return { allowed: success, headers };
}
