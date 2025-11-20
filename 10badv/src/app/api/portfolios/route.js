import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import mysql from 'mysql2/promise';

// MySQL 연결 설정
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'merk',
  database: '10badv'
};

// GET: 포트폴리오 목록 조회
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const designerId = searchParams.get('designerId');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    
    const connection = await mysql.createConnection(dbConfig);
    
    let query = `
      SELECT 
        p.*,
        u.name as designer_name,
        u.username as designer_username
      FROM portfolios p
      LEFT JOIN users u ON p.designer_id = u.id
    `;
    const params = [];
    const conditions = [];
    
    if (designerId) {
      conditions.push('p.designer_id = ?');
      params.push(designerId);
    }
    
    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY p.created_at DESC';
    
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        query += ` LIMIT ${limitNum}`;
      }
    }
    
    const [portfolios] = await connection.execute(query, params);
    
    // thumbnail_url을 image_url로 매핑
    const formattedPortfolios = portfolios.map(p => ({
      ...p,
      image_url: p.thumbnail_url
    }));
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      portfolios: formattedPortfolios
    });
  } catch (error) {
    console.error('포트폴리오 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: 새 포트폴리오 생성
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'designer') {
      return NextResponse.json(
        { success: false, error: '디자이너만 포트폴리오를 생성할 수 있습니다.' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    const { title, description, category, price, thumbnail_url, images } = data;
    
    // 필수 필드 확인
    if (!title || !description || !category || !price) {
      return NextResponse.json(
        { success: false, error: '필수 항목을 모두 입력해주세요.' },
        { status: 400 }
      );
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    // 포트폴리오 생성
    const [result] = await connection.execute(
      `INSERT INTO portfolios 
       (designer_id, title, description, category, price, thumbnail_url, status, views, likes) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, 0)`,
      [session.user.id, title, description, category, price, thumbnail_url || null]
    );
    
    const portfolioId = result.insertId;
    
    // 추가 이미지가 있으면 저장
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await connection.execute(
          'INSERT INTO portfolio_images (portfolio_id, image_url, display_order) VALUES (?, ?, ?)',
          [portfolioId, images[i], i]
        );
      }
    }
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      portfolioId,
      message: '포트폴리오가 성공적으로 등록되었습니다. 관리자 승인 후 공개됩니다.'
    });
  } catch (error) {
    console.error('포트폴리오 생성 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
