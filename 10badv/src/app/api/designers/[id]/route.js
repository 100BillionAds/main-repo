import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// MySQL 연결 설정
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || 'merk',
  database: process.env.DATABASE_NAME || '10badv'
};

// GET: 디자이너 상세 정보 조회
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const connection = await mysql.createConnection(dbConfig);

    // 디자이너 기본 정보
    const [designers] = await connection.execute(
      `SELECT 
        u.id,
        u.name,
        u.username,
        u.email,
        u.role,
        u.points,
        u.created_at,
        COALESCE(AVG(r.rating), 0) as rating,
        COUNT(DISTINCT t.id) as completed_works,
        COUNT(DISTINCT p.id) as portfolio_count,
        COUNT(DISTINCT r.id) as review_count,
        GROUP_CONCAT(DISTINCT p.category) as specialty,
        (SELECT COUNT(*) FROM transactions WHERE designer_id = u.id AND status = 'completed') as total_completed,
        (SELECT COUNT(*) FROM transactions WHERE designer_id = u.id) as total_transactions
      FROM users u
      LEFT JOIN portfolios p ON u.id = p.designer_id
      LEFT JOIN transactions t ON u.id = t.designer_id AND t.status = 'completed'
      LEFT JOIN reviews r ON u.id = r.designer_id
      WHERE u.id = ? AND u.role = 'designer'
      GROUP BY u.id, u.name, u.username, u.email, u.role, u.points, u.created_at`,
      [id]
    );

    if (designers.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '디자이너를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const designer = designers[0];

    // 디자이너의 포트폴리오 목록
    const [portfolios] = await connection.execute(
      `SELECT 
        p.id,
        p.title,
        p.description,
        p.price,
        p.category,
        p.thumbnail_url as image_url,
        p.created_at
      FROM portfolios p
      WHERE p.designer_id = ?
      ORDER BY p.created_at DESC`,
      [id]
    );

    // 리뷰 목록 조회
    const [reviews] = await connection.execute(
      `SELECT 
        r.*,
        u.name as buyer_name,
        t.portfolio_id,
        p.title as portfolio_title
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      LEFT JOIN transactions t ON r.transaction_id = t.id
      LEFT JOIN portfolios p ON t.portfolio_id = p.id
      WHERE r.designer_id = ?
      ORDER BY r.created_at DESC`,
      [id]
    );

    await connection.end();

    // 데이터 포맷팅
    const specialtyList = designer.specialty ? designer.specialty.split(',') : [];
    const completionRate = designer.total_transactions > 0 
      ? Math.round((designer.total_completed / designer.total_transactions) * 100)
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
      introduction: null // 기본값
    };

    const formattedPortfolios = portfolios.map(p => ({
      ...p,
      images: p.images ? (typeof p.images === 'string' ? JSON.parse(p.images) : p.images) : [],
      review_count: parseInt(p.review_count) || 0,
      avg_rating: parseFloat(p.avg_rating) || 0
    }));

    return NextResponse.json({
      success: true,
      designer: formattedDesigner,
      portfolios: formattedPortfolios,
      reviews: reviews
    });
  } catch (error) {
    console.error('디자이너 상세 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: '디자이너 상세 조회 실패' },
      { status: 500 }
    );
  }
}
