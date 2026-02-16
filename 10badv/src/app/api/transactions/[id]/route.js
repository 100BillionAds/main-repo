import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

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

// PATCH: 거래 상태 업데이트
export async function PATCH(request, { params }) {
  const connection = await pool.getConnection();
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      connection.release();
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    if (!status) {
      connection.release();
      return NextResponse.json({ success: false, error: '상태 값이 필요합니다.' }, { status: 400 });
    }

    const [transactions] = await connection.execute(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );

    if (transactions.length === 0) {
      connection.release();
      return NextResponse.json({ success: false, error: '거래를 찾을 수 없습니다.' }, { status: 404 });
    }

    const transaction = transactions[0];
    const userId = parseInt(session.user.id);

    const isBuyer = transaction.buyer_id === userId;
    const isDesigner = transaction.designer_id === userId;
    const isAdmin = session.user.role === 'admin';

    if (!isBuyer && !isDesigner && !isAdmin) {
      connection.release();
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    // 상태 전환 검증
    const validTransitions = {
      'pending': ['in_progress', 'cancelled'],
      'in_progress': ['awaiting_confirmation', 'cancelled'],
      'awaiting_confirmation': ['completed', 'in_progress'],
      'completed': [],
      'cancelled': []
    };

    if (!validTransitions[transaction.status]?.includes(status)) {
      connection.release();
      return NextResponse.json({ success: false, error: '유효하지 않은 상태 전환입니다.' }, { status: 400 });
    }

    // 역할별 권한 검증
    if (status === 'in_progress' && transaction.status === 'pending' && !isDesigner && !isAdmin) {
      connection.release();
      return NextResponse.json({ success: false, error: '디자이너만 거래를 진행 중으로 변경할 수 있습니다.' }, { status: 403 });
    }

    if (status === 'awaiting_confirmation' && !isDesigner && !isAdmin) {
      connection.release();
      return NextResponse.json({ success: false, error: '디자이너만 작업 완료를 할 수 있습니다.' }, { status: 403 });
    }

    if (status === 'completed' && transaction.status === 'awaiting_confirmation' && !isBuyer && !isAdmin) {
      connection.release();
      return NextResponse.json({ success: false, error: '광고주만 거래 완료 승인을 할 수 있습니다.' }, { status: 403 });
    }

    await connection.beginTransaction();

    // 상태 업데이트
    await connection.execute(
      'UPDATE transactions SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    // completed: 디자이너에게 포인트 지급
    if (status === 'completed' && transaction.status !== 'completed') {
      // 수수료 계산 (10%)
      const commission = Math.floor(transaction.amount * 0.1);
      const designerAmount = transaction.amount - commission;

      await connection.execute(
        'UPDATE transactions SET commission = ? WHERE id = ?',
        [commission, id]
      );

      await connection.execute(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [designerAmount, transaction.designer_id]
      );

      const [updatedUser] = await connection.execute(
        'SELECT points FROM users WHERE id = ?',
        [transaction.designer_id]
      );

      await connection.execute(
        `INSERT INTO point_transactions (user_id, amount, type, description, balance_after, reference_type, reference_id, status, created_at)
         VALUES (?, ?, 'earn', ?, ?, 'transaction', ?, 'completed', NOW())`,
        [transaction.designer_id, designerAmount, `거래 #${id} 완료 대금 지급 (수수료 ${commission.toLocaleString()}원 차감)`, updatedUser[0].points, id]
      );
    }

    // cancelled: 구매자에게 포인트 환불
    if (status === 'cancelled' && transaction.payment_status === 'completed') {
      await connection.execute(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [transaction.amount, transaction.buyer_id]
      );

      const [refundedUser] = await connection.execute(
        'SELECT points FROM users WHERE id = ?',
        [transaction.buyer_id]
      );

      await connection.execute(
        `INSERT INTO point_transactions (user_id, amount, type, description, balance_after, reference_type, reference_id, status, created_at)
         VALUES (?, ?, 'refund', ?, ?, 'transaction', ?, 'completed', NOW())`,
        [transaction.buyer_id, transaction.amount, `거래 #${id} 취소 환불`, refundedUser[0].points, id]
      );

      await connection.execute(
        'UPDATE transactions SET payment_status = ? WHERE id = ?',
        ['refunded', id]
      );
    }

    await connection.commit();
    connection.release();

    return NextResponse.json({ success: true, message: '거래 상태가 업데이트되었습니다.' });
  } catch (error) {
    await connection.rollback().catch(() => {});
    connection.release();
    console.error('거래 업데이트 실패:', error);
    return NextResponse.json({ success: false, error: '거래 상태 업데이트에 실패했습니다.' }, { status: 500 });
  }
}
