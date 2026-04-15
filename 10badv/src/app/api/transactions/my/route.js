import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// GET: 내 거래 내역 조회 (구매자 + 디자이너)
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const userId = parseInt(session.user.id);

    let query = `
      SELECT 
        t.*,
        p.title as portfolio_title,
        p.thumbnail_url as portfolio_image,
        p.description as portfolio_description,
        designer.name as designer_name,
        designer.username as designer_username,
        buyer.name as buyer_name,
        buyer.username as buyer_username,
        CASE 
          WHEN t.buyer_id = ? THEN 'buyer'
          WHEN t.designer_id = ? THEN 'seller'
          ELSE 'unknown'
        END as my_role
      FROM transactions t
      LEFT JOIN portfolios p ON t.portfolio_id = p.id
      LEFT JOIN users designer ON t.designer_id = designer.id
      LEFT JOIN users buyer ON t.buyer_id = buyer.id
      WHERE (t.buyer_id = ? OR t.designer_id = ?)
    `;
    let params = [userId, userId, userId, userId];
    let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE (buyer_id = ? OR designer_id = ?)';
    let countParams = [userId, userId];

    if (status && status !== 'all') {
      query += ' AND t.status = ?';
      params.push(status);
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    query += ` ORDER BY t.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [[rows], [countResult]] = await Promise.all([
      pool.execute(query, params),
      pool.execute(countQuery, countParams)
    ]);

    return NextResponse.json({
      success: true,
      transactions: rows,
      pagination: {
        page, limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('거래 내역 조회 오류:', error);
    return NextResponse.json({ error: '거래 내역을 불러오는데 실패했습니다.' }, { status: 500 });
  }
}
