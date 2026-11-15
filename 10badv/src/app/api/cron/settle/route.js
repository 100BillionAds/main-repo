import { NextResponse } from 'next/server';
import { runAutoSettlement } from '@/domain/escrow/escrowService';
import { errorResponse } from '@/lib/apiResponse';
import { isCronAuthorized } from '@/lib/cronAuth';

export const dynamic = 'force-dynamic';

/**
 * 에스크로 자동정산 실행.
 * 호출 주체: server.js 내장 스케줄러, 외부 크론(Vercel Cron 등), 또는 관리자.
 * 인증: `Authorization: Bearer $CRON_SECRET` 또는 관리자 세션.
 */
async function settle(request) {
  try {
    if (!(await isCronAuthorized(request))) {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 401 });
    }

    const summary = await runAutoSettlement();

    return NextResponse.json({
      success: true,
      confirmed: summary.confirmed.length,
      cancelled: summary.cancelled.length,
      skipped: summary.skipped.length,
      failed: summary.failed.length,
      detail: summary,
    });
  } catch (error) {
    return errorResponse(error, '자동정산 실행에 실패했습니다.', '자동정산 실행 실패');
  }
}

export { settle as GET, settle as POST };
