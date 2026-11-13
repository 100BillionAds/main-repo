import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { purchasePortfolio } from '@/domain/escrow/escrowService';
import { errorResponse } from '@/lib/apiResponse';

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20', 10) || 20));
    const offset = (page - 1) * limit;

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
    let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE 1=1';
    const params = [];
    const countParams = [];

    if (session.user.role !== 'admin') {
      query += ' AND (t.buyer_id = ? OR t.designer_id = ?)';
      countQuery += ' AND (buyer_id = ? OR designer_id = ?)';
      params.push(session.user.id, session.user.id);
      countParams.push(session.user.id, session.user.id);
    }

    if (userId) {
      query += ' AND (t.buyer_id = ? OR t.designer_id = ?)';
      countQuery += ' AND (buyer_id = ? OR designer_id = ?)';
      params.push(userId, userId);
      countParams.push(userId, userId);
    }

    if (status) {
      query += ' AND t.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    // LIMIT/OFFSET 은 검증된 정수 리터럴로 넣는다 (prepared statement 바인딩 시 MySQL 8 오류)
    query += ` ORDER BY t.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [[transactions], [countResult]] = await Promise.all([
      pool.execute(query, params),
      pool.execute(countQuery, countParams)
    ]);

    return NextResponse.json({
      success: true,
      transactions,
      pagination: {
        page, limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('거래 조회 실패:', error);
    return NextResponse.json({ success: false, error: '거래 조회에 실패했습니다.' }, { status: 500 });
  }
}

// POST: 새 거래 생성 (포인트 결제 → 에스크로 보관)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { portfolio_id, amount } = await request.json();

    const { transactionId, points } = await purchasePortfolio({
      buyerId: session.user.id,
      portfolioId: portfolio_id,
      requestedAmount: amount,
    });

    return NextResponse.json({
      success: true,
      transactionId,
      message: '구매가 완료되었습니다. 디자이너가 작업을 시작할 때까지 기다려주세요.',
      points
    });
  } catch (error) {
    return errorResponse(error, '거래 생성에 실패했습니다.', '거래 생성 실패');
  }
}
