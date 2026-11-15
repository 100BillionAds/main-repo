/**
 * LLM 호출 실패. 제공자마다 다른 오류를 같은 모양으로 바꿔, 위쪽 코드가 제공자를 몰라도 되게 한다.
 *
 * code
 *  - RATE_LIMITED  요청이 너무 많음 (429)            → 잠시 뒤 재시도하면 될 수 있음
 *  - UNAVAILABLE   제공자 장애·과부하 (5xx)          → 재시도
 *  - NETWORK       연결 실패                         → 재시도
 *  - TIMEOUT       제한 시간 초과                    → 재시도
 *  - AUTH          API 키 문제 (401/403)             → 재시도해도 소용없음
 *  - BAD_REQUEST   우리 요청이 잘못됨 (400)          → 재시도해도 소용없음 (코드 버그)
 *  - CONFIG        환경변수 누락 등 설정 문제
 *  - ABORTED       호출한 쪽이 취소함 (사용자가 페이지를 떠남)
 */
export class LlmError extends Error {
  constructor(message, { code, provider, status, retryable = false, cause } = {}) {
    super(message);
    this.name = 'LlmError';
    this.code = code;
    this.provider = provider;
    this.status = status;
    this.retryable = retryable;
    if (cause) this.cause = cause;
  }
}

/** HTTP 상태 코드를 LlmError 로 바꾼다. */
export function errorFromStatus(provider, status, detail = '') {
  const message = `${provider} 응답 오류 (${status})${detail ? `: ${detail}` : ''}`;
  if (status === 429) return new LlmError(message, { code: 'RATE_LIMITED', provider, status, retryable: true });
  if (status === 401 || status === 403) return new LlmError(message, { code: 'AUTH', provider, status });
  if (status === 408) return new LlmError(message, { code: 'TIMEOUT', provider, status, retryable: true });
  if (status >= 500) return new LlmError(message, { code: 'UNAVAILABLE', provider, status, retryable: true });
  return new LlmError(message, { code: 'BAD_REQUEST', provider, status });
}

/** fetch 가 던진 예외(연결 실패, 취소)를 LlmError 로 바꾼다. */
export function errorFromFetch(provider, error) {
  if (error instanceof LlmError) return error;
  if (error?.name === 'AbortError') {
    return new LlmError(`${provider} 호출이 취소됐습니다.`, { code: 'ABORTED', provider, cause: error });
  }
  return new LlmError(`${provider} 에 연결하지 못했습니다: ${error?.message || error}`, {
    code: 'NETWORK',
    provider,
    retryable: true,
    cause: error,
  });
}
