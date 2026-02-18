import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// POST: 리뷰 작성
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { transaction_id, designer_id, rating, comment } = await request.json();

    if (!transaction_id || !designer_id || !rating) {
      return NextResponse.json({ success: false, error: '필수 정보가 누락되었습니다.' }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: '평점은 1~5 사이여야 합니다.' }, { status: 400 });
    }

    // 거래 확인 (completed 상태이고 본인이 참여한 거래인지)
    const [transactions] = await pool.execute(
      'SELECT * FROM transactions WHERE id = ? AND buyer_id = ? AND status = ?',
      [transaction_id, session.user.id, 'completed']
    );

    if (transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: '완료된 거래만 리뷰를 작성할 수 있습니다.' },
        { status: 403 }
      );
    }

    // 이미 리뷰 작성했는지 확인
    const [existingReviews] = await pool.execute(
      'SELECT * FROM reviews WHERE transaction_id = ? AND reviewer_id = ?',
      [transaction_id, session.user.id]
    );

    if (existingReviews.length > 0) {
      return NextResponse.json({ success: false, error: '이미 리뷰를 작성했습니다.' }, { status: 400 });
    }

    // 리뷰 작성
    await pool.execute(
      `INSERT INTO reviews (transaction_id, reviewer_id, designer_id, rating, comment, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [transaction_id, session.user.id, designer_id, rating, comment || null]
    );

    // 디자이너 평균 별점 업데이트
    const [avgResult] = await pool.execute(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE designer_id = ?',
      [designer_id]
    );

    if (avgResult.length > 0 && avgResult[0].avg_rating !== null) {
      const avgRating = parseFloat(avgResult[0].avg_rating).toFixed(2);
      const reviewCount = parseInt(avgResult[0].review_count);

      await pool.execute(
        'UPDATE users SET rating = ?, review_count = ? WHERE id = ?',
        [avgRating, reviewCount, designer_id]
      );
    }

    return NextResponse.json({ success: true, message: '리뷰가 등록되었습니다.' });
  } catch (error) {
    console.error('리뷰 작성 실패:', error);
    return NextResponse.json({ success: false, error: '리뷰 작성에 실패했습니다.' }, { status: 500 });
  }
}

// GET: 리뷰 조회
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const designer_id = searchParams.get('designer_id');
    const transaction_id = searchParams.get('transaction_id');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    let query = `
      SELECT r.*, u.name as reviewer_name, u.username as reviewer_username
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM reviews WHERE 1=1';
    const params = [];
    const countParams = [];

    if (designer_id) {
      query += ' AND r.designer_id = ?'; params.push(designer_id);
      countQuery += ' AND designer_id = ?'; countParams.push(designer_id);
    }
    if (transaction_id) {
      query += ' AND r.transaction_id = ?'; params.push(transaction_id);
      countQuery += ' AND transaction_id = ?'; countParams.push(transaction_id);
    }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [[reviews], [countResult]] = await Promise.all([
      pool.execute(query, params),
      pool.execute(countQuery, countParams)
    ]);

    return NextResponse.json({
      success: true,
      reviews,
      pagination: {
        page, limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    console.error('리뷰 조회 실패:', error);
    return NextResponse.json({ success: false, error: '리뷰 조회에 실패했습니다.' }, { status: 500 });
  }
}
