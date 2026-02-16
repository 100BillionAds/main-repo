import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: 디자이너 상세 정보 조회
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const [designers] = await pool.execute(
      `SELECT
        u.id, u.name, u.username, u.email, u.role, u.avatar_url, u.bio, u.created_at,
        u.rating, u.review_count,
        COUNT(DISTINCT p.id) as portfolio_count,
        (SELECT COUNT(*) FROM transactions WHERE designer_id = u.id AND status = 'completed') as completed_works,
        (SELECT COUNT(*) FROM transactions WHERE designer_id = u.id) as total_transactions,
        GROUP_CONCAT(DISTINCT p.category) as specialty
      FROM users u
      LEFT JOIN portfolios p ON u.id = p.designer_id
      WHERE u.id = ? AND u.role = 'designer'
      GROUP BY u.id`,
      [id]
    );

    if (designers.length === 0) {
      return NextResponse.json({ success: false, error: '디자이너를 찾을 수 없습니다.' }, { status: 404 });
    }

    const designer = designers[0];

    const [portfolios] = await pool.execute(
      `SELECT p.id, p.title, p.description, p.price, p.category,
              p.thumbnail_url as image_url, p.created_at, p.views, p.likes
       FROM portfolios p
       WHERE p.designer_id = ? AND p.status = 'approved'
       ORDER BY p.created_at DESC`,
      [id]
    );

    const [reviews] = await pool.execute(
      `SELECT r.*, u.name as buyer_name, t.portfolio_id, p.title as portfolio_title
       FROM reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       LEFT JOIN transactions t ON r.transaction_id = t.id
       LEFT JOIN portfolios p ON t.portfolio_id = p.id
       WHERE r.designer_id = ?
       ORDER BY r.created_at DESC`,
      [id]
    );

    const specialtyList = designer.specialty ? designer.specialty.split(',') : [];
    const completionRate = designer.total_transactions > 0
      ? Math.round((designer.completed_works / designer.total_transactions) * 100)
      : 0;

    const formattedDesigner = {
      ...designer,
      specialty: specialtyList[0] || '전문분야 미설정',
      skills: specialtyList,
      rating: parseFloat(designer.rating) || 0,
      completed_works: parseInt(designer.completed_works) || 0,
      portfolio_count: parseInt(designer.portfolio_count) || 0,
      completion_rate: completionRate,
      is_verified: parseInt(designer.completed_works) > 0,
    };

    return NextResponse.json({
      success: true,
      designer: formattedDesigner,
      portfolios,
      reviews
    });
  } catch (error) {
    console.error('디자이너 상세 조회 실패:', error);
    return NextResponse.json({ success: false, error: '디자이너 상세 조회에 실패했습니다.' }, { status: 500 });
  }
}
