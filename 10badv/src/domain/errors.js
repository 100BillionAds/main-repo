/**
 * 도메인 규칙 위반을 나타내는 오류.
 * API 라우트는 이 오류를 잡아 status/message 를 그대로 응답으로 변환한다.
 */
export class DomainError extends Error {
  constructor(message, { status = 400, code = 'DOMAIN_ERROR' } = {}) {
    super(message);
    this.name = 'DomainError';
    this.status = status;
    this.code = code;
  }
}

export function isDomainError(error) {
  return error instanceof DomainError || error?.name === 'DomainError';
}

export function toPositiveInteger(value) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    return null;
  }
  return value;
}
