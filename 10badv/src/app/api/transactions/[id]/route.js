import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { changeTransactionStatus } from '@/domain/escrow/escrowService';
import { errorResponse } from '@/lib/apiResponse';

// GET: 단일 거래 조회
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;
    const [transactions] = await pool.execute(
      `SELECT
        t.*,
        p.title as portfolio_title,
        d.name as designer_name,
        d.username as designer_username,
        b.name as buyer_name,
        b.username as buyer_username
      FROM transactions t
      LEFT JOIN portfolios p ON t.portfolio_id = p.id
      LEFT JOIN users d ON t.designer_id = d.id
      LEFT JOIN users b ON t.buyer_id = b.id
      WHERE t.id = ?`,
      [id]
    );

    if (transactions.length === 0) {
      return NextResponse.json({ success: false, error: '거래를 찾을 수 없습니다.' }, { status: 404 });
    }

    const transaction = transactions[0];
    const userId = parseInt(session.user.id);

    if (transaction.designer_id !== userId && transaction.buyer_id !== userId && session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    console.error('거래 조회 실패:', error);
    return NextResponse.json({ success: false, error: '거래 조회에 실패했습니다.' }, { status: 500 });
  }
}

// PATCH: 거래 상태 업데이트 (작업 시작 / 작업 완료 / 수정 요청 / 구매확정 / 취소)
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    const result = await changeTransactionStatus({
      transactionId: id,
      actor: { id: session.user.id, role: session.user.role },
      status,
    });

    return NextResponse.json({ success: true, message: '거래 상태가 업데이트되었습니다.', transaction: result });
  } catch (error) {
    return errorResponse(error, '거래 상태 업데이트에 실패했습니다.', '거래 업데이트 실패');
  }
}
