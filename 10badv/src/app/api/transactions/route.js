import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// GET: 거래 내역 조회
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    let query = `
      SELECT t.*,
             p.title as portfolio_title,
             buyer.name as buyer_name,
             designer.name as designer_name
      FROM transactions t
      LEFT JOIN portfolios p ON t.portfolio_id = p.id
      LEFT JOIN users buyer ON t.buyer_id = buyer.id
      LEFT JOIN users designer ON t.designer_id = designer.id
      WHERE 1=1
    `;
    const params = [];

    if (session.user.role !== 'admin') {
      query += ' AND (t.buyer_id = ? OR t.designer_id = ?)';
      params.push(session.user.id, session.user.id);
    }

    if (userId) {
      query += ' AND (t.buyer_id = ? OR t.designer_id = ?)';
      params.push(userId, userId);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC';

    const [transactions] = await pool.execute(query, params);

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error('거래 조회 실패:', error);
    return NextResponse.json({ success: false, error: '거래 조회에 실패했습니다.' }, { status: 500 });
  }
}

// POST: 새 거래 생성 (포인트 결제)
export async function POST(request) {
  const connection = await pool.getConnection();
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      connection.release();
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { portfolio_id, amount } = await request.json();

    if (!portfolio_id || !amount) {
      connection.release();
      return NextResponse.json({ success: false, error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    await connection.beginTransaction();

    // 포트폴리오 정보 조회
    const [portfolios] = await connection.execute(
      'SELECT * FROM portfolios WHERE id = ? AND status = ?',
      [portfolio_id, 'approved']
    );

    if (portfolios.length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ success: false, error: '포트폴리오를 찾을 수 없거나 승인되지 않았습니다.' }, { status: 404 });
    }

    const portfolio = portfolios[0];

    if (portfolio.designer_id === parseInt(session.user.id)) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ success: false, error: '자신의 포트폴리오는 구매할 수 없습니다.' }, { status: 400 });
    }

    // 구매자 포인트 조회
    const [buyers] = await connection.execute(
      'SELECT points FROM users WHERE id = ? FOR UPDATE',
      [session.user.id]
    );

    if (buyers.length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ success: false, error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    const buyerPoints = buyers[0].points || 0;

    if (buyerPoints < amount) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({
        success: false,
        error: `포인트가 부족합니다. (필요: ${amount.toLocaleString()}P, 보유: ${buyerPoints.toLocaleString()}P)`
      }, { status: 400 });
    }

    // 구매자 포인트 차감 (에스크로)
    const newBuyerBalance = buyerPoints - amount;
    await connection.execute(
      'UPDATE users SET points = ? WHERE id = ?',
      [newBuyerBalance, session.user.id]
    );

    // 거래 생성
    const [result] = await connection.execute(
      `INSERT INTO transactions
       (portfolio_id, buyer_id, designer_id, amount, status, payment_method, payment_status)
       VALUES (?, ?, ?, ?, 'pending', 'points', 'completed')`,
      [portfolio_id, session.user.id, portfolio.designer_id, amount]
    );

    const transactionId = result.insertId;

    // 포인트 사용 내역 기록
    await connection.execute(
      `INSERT INTO point_transactions
       (user_id, type, amount, balance_after, description, reference_type, reference_id, status)
       VALUES (?, 'use', ?, ?, ?, 'transaction', ?, 'completed')`,
      [session.user.id, amount, newBuyerBalance, `포트폴리오 구매 (에스크로): ${portfolio.title}`, transactionId]
    );

    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      transactionId,
      message: '구매가 완료되었습니다. 디자이너가 작업을 시작할 때까지 기다려주세요.',
      points: newBuyerBalance
    });
  } catch (error) {
    await connection.rollback().catch(() => {});
    connection.release();
    console.error('거래 생성 실패:', error);
    return NextResponse.json({ success: false, error: '거래 생성에 실패했습니다.' }, { status: 500 });
  }
}
