import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// MySQL 연결 설정
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || 'merk',
  database: process.env.DATABASE_NAME || '10badv'
};

// GET: 디자이너 목록 조회
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get('specialty');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const connection = await mysql.createConnection(dbConfig);
    
    // 디자이너 역할을 가진 사용자 조회 (현재 테이블 구조에 맞게 수정)
    let query = `
      SELECT 
        u.id,
        u.name,
        u.username,
        u.email,
        u.role,
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
      WHERE u.role = 'designer'
    `;
    
    const params = [];
    
    if (specialty) {
      query += ' AND p.category LIKE ?';
      params.push(`%${specialty}%`);
    }
    
    query += ' GROUP BY u.id, u.name, u.username, u.email, u.role, u.created_at';
    query += ' ORDER BY rating DESC, completed_works DESC';
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    const [designers] = await connection.execute(query, params);
    
    // 디자이너 데이터 포맷팅
    const processedDesigners = designers.map(designer => {
      const specialtyList = designer.specialty ? designer.specialty.split(',') : [];
      const completionRate = designer.total_transactions > 0 
        ? Math.round((designer.total_completed / designer.total_transactions) * 100)
        : 0;
      
      return {
        ...designer,
        avatar_url: null, // 기본값
        bio: null, // 기본값
        specialty: specialtyList[0] || '전문분야 미설정',
        tags: specialtyList.slice(0, 3),
        is_verified: parseInt(designer.completed_works) > 0,
        rating: parseFloat(designer.rating) || 0,
        completed_works: parseInt(designer.completed_works) || 0,
        portfolio_count: parseInt(designer.portfolio_count) || 0,
        completion_rate: completionRate
      };
    });
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      designers: processedDesigners,
      total: processedDesigners.length
    });
  } catch (error) {
    console.error('디자이너 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
