import { NextResponse } from 'next/server';
import { isDomainError } from '@/domain/errors';

/**
 * 라우트 공통 오류 응답.
 * 도메인 규칙 위반은 그 메시지와 상태 코드로, 그 외는 500 과 일반 메시지로 응답한다.
 */
export function errorResponse(error, fallbackMessage, logLabel = fallbackMessage) {
  if (isDomainError(error)) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status }
    );
  }

  console.error(`${logLabel}:`, error);
  return NextResponse.json({ success: false, error: fallbackMessage }, { status: 500 });
}
