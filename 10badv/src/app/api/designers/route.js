import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET: 디자이너 목록 조회
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get('specialty');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    let query = `
      SELECT
        u.id, u.name, u.username, u.email, u.role, u.avatar_url, u.bio, u.created_at,
        u.rating, u.review_count,
        COUNT(DISTINCT p.id) as portfolio_count,
        (SELECT COUNT(*) FROM transactions WHERE designer_id = u.id AND status = 'completed') as completed_works,
        (SELECT COUNT(*) FROM transactions WHERE designer_id = u.id) as total_transactions,
        GROUP_CONCAT(DISTINCT p.category) as specialty
      FROM users u
      LEFT JOIN portfolios p ON u.id = p.designer_id
      WHERE u.role = 'designer' AND u.status = 'active'
    `;
    const params = [];

    if (specialty) {
      query += ' AND p.category LIKE ?';
      params.push(`%${specialty}%`);
    }

    query += ' GROUP BY u.id';
    query += ' ORDER BY u.rating DESC, completed_works DESC';
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [designers] = await pool.execute(query, params);

    const processedDesigners = designers.map(designer => {
      const specialtyList = designer.specialty ? designer.specialty.split(',') : [];
      const completionRate = designer.total_transactions > 0
        ? Math.round((designer.completed_works / designer.total_transactions) * 100)
        : 100;

      return {
        id: designer.id,
        name: designer.name,
        username: designer.username,
        email: designer.email,
        role: designer.role,
        avatar_url: designer.avatar_url,
        bio: designer.bio,
        specialty: specialtyList[0] || '전문분야 미설정',
        tags: specialtyList.slice(0, 3),
        is_verified: parseInt(designer.completed_works) > 0,
        rating: parseFloat(designer.rating) || 0,
        completed_works: parseInt(designer.completed_works) || 0,
        portfolio_count: parseInt(designer.portfolio_count) || 0,
        completion_rate: completionRate
      };
    });

    return NextResponse.json({
      success: true,
      designers: processedDesigners,
      total: processedDesigners.length
    });
  } catch (error) {
    console.error('디자이너 조회 실패:', error);
    return NextResponse.json({ success: false, error: '디자이너 조회에 실패했습니다.' }, { status: 500 });
  }
}
