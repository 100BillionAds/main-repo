import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import mysql from 'mysql2/promise';

// MySQL 연결 설정
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || 'merk',
  database: process.env.DATABASE_NAME || '10badv'
};

// POST: 리뷰 작성
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { transaction_id, designer_id, rating, comment } = await request.json();

    console.log('📝 리뷰 작성 요청:', { transaction_id, designer_id, rating, comment, reviewer_id: session.user.id });

    if (!transaction_id || !designer_id || !rating) {
      console.log('❌ 필수 정보 누락:', { transaction_id, designer_id, rating });
      return NextResponse.json(
        { success: false, error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);

    // 거래 확인 (본인이 참여한 거래인지)
    const [transactions] = await connection.execute(
      'SELECT * FROM transactions WHERE id = ? AND (buyer_id = ? OR designer_id = ?)',
      [transaction_id, session.user.id, session.user.id]
    );

    if (transactions.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '권한이 없거나 거래를 찾을 수 없습니다.' },
        { status: 403 }
      );
    }

    // 이미 리뷰를 작성했는지 확인
    const [existingReviews] = await connection.execute(
      'SELECT * FROM reviews WHERE transaction_id = ? AND reviewer_id = ?',
      [transaction_id, session.user.id]
    );

    if (existingReviews.length > 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '이미 리뷰를 작성했습니다.' },
        { status: 400 }
      );
    }

    // 리뷰 작성
    await connection.execute(
      `INSERT INTO reviews (transaction_id, reviewer_id, designer_id, rating, comment, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [transaction_id, session.user.id, designer_id, rating, comment || null]
    );

    // 디자이너의 평균 별점 계산 및 업데이트
    const [avgResult] = await connection.execute(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE designer_id = ?',
      [designer_id]
    );
    
    if (avgResult.length > 0 && avgResult[0].avg_rating !== null) {
      const avgRating = parseFloat(avgResult[0].avg_rating).toFixed(2);
      const reviewCount = parseInt(avgResult[0].review_count);
      
      console.log(`📊 디자이너 #${designer_id} 평균 별점 업데이트: ${avgRating} (리뷰 ${reviewCount}개)`);
      
      // users 테이블에 평균 별점과 리뷰 수 업데이트
      await connection.execute(
        'UPDATE users SET rating = ?, review_count = ? WHERE id = ?',
        [avgRating, reviewCount, designer_id]
      );
    }

    await connection.end();

    return NextResponse.json({
      success: true,
      message: '리뷰가 등록되었습니다.'
    });
  } catch (error) {
    console.error('리뷰 작성 실패:', error);
    // 에러 상세 정보 출력
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.error('❌ 컬럼이 존재하지 않습니다. 개발 서버를 재시작하세요.');
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET: 리뷰 조회
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const designer_id = searchParams.get('designer_id');
    const transaction_id = searchParams.get('transaction_id');

    const connection = await mysql.createConnection(dbConfig);
    
    let query = `
      SELECT 
        r.*,
        u.name as reviewer_name,
        u.username as reviewer_username
      FROM reviews r
      LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (designer_id) {
      query += ' AND r.designer_id = ?';
      params.push(designer_id);
    }

    if (transaction_id) {
      query += ' AND r.transaction_id = ?';
      params.push(transaction_id);
    }

    query += ' ORDER BY r.created_at DESC';

    const [reviews] = await connection.execute(query, params);
    await connection.end();

    return NextResponse.json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('리뷰 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
