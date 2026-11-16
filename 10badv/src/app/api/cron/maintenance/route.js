import { NextResponse } from 'next/server';
import { runCleanup } from '@/domain/maintenance/cleanup';
import { errorResponse } from '@/lib/apiResponse';
import { isCronAuthorized } from '@/lib/cronAuth';

export const dynamic = 'force-dynamic';

/**
 * 정리 작업 실행 (오래된 처리 완료 이벤트, 읽은 알림, AI 사용 기록 삭제).
 * 호출 주체: server.js 내장 스케줄러(하루 1회), GitHub Actions, 또는 관리자.
 * 인증: `Authorization: Bearer $CRON_SECRET` 또는 관리자 세션.
 */
async function maintain(request) {
  try {
    if (!(await isCronAuthorized(request))) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 401 });
    }
    const deleted = await runCleanup();
    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    return errorResponse(error, '정리 작업에 실패했습니다.', '정리 작업 실패');
  }
}

export { maintain as GET, maintain as POST };
