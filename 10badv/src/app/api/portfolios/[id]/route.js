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

// GET: 단일 포트폴리오 조회
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const connection = await mysql.createConnection(dbConfig);
    
    // 포트폴리오 정보 및 디자이너 정보 조회
    const [portfolios] = await connection.execute(
      `SELECT 
        p.*,
        u.name as designer_name,
        u.username as designer_username
      FROM portfolios p
      LEFT JOIN users u ON p.designer_id = u.id
      WHERE p.id = ?`,
      [id]
    );
    
    if (portfolios.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '포트폴리오를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 추가 이미지 조회
    const [images] = await connection.execute(
      'SELECT * FROM portfolio_images WHERE portfolio_id = ? ORDER BY display_order',
      [id]
    );
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      portfolio: {
        ...portfolios[0],
        images
      }
    });
  } catch (error) {
    console.error('포트폴리오 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH: 포트폴리오 수정
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const data = await request.json();
    const { title, description, category, price, thumbnail_url, images, status } = data;
    
    const connection = await mysql.createConnection(dbConfig);
    
    // 포트폴리오 소유자 확인
    const [portfolios] = await connection.execute(
      'SELECT designer_id FROM portfolios WHERE id = ?',
      [id]
    );
    
    if (portfolios.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '포트폴리오를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 권한 확인 (본인 또는 관리자만)
    const isOwner = portfolios[0].designer_id === session.user.id;
    const isAdmin = session.user.role === 'admin';
    
    if (!isOwner && !isAdmin) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '수정 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 포트폴리오 업데이트
    const updates = [];
    const values = [];
    
    if (title !== undefined && title !== null) { 
      updates.push('title = ?'); 
      values.push(title); 
    }
    if (description !== undefined && description !== null) { 
      updates.push('description = ?'); 
      values.push(description); 
    }
    if (category !== undefined && category !== null) { 
      updates.push('category = ?'); 
      values.push(category); 
    }
    if (price !== undefined && price !== null) { 
      updates.push('price = ?'); 
      values.push(price); 
    }
    if (thumbnail_url !== undefined && thumbnail_url !== null) { 
      updates.push('thumbnail_url = ?'); 
      values.push(thumbnail_url); 
    }
    
    // 관리자만 status 변경 가능
    if (status !== undefined && status !== null && isAdmin) {
      updates.push('status = ?');
      values.push(status);
    }
    
    if (updates.length > 0) {
      values.push(id);
      await connection.execute(
        `UPDATE portfolios SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
    }
    
    // 이미지 업데이트 (기존 이미지 삭제 후 새로 추가)
    if (images !== undefined && images !== null && Array.isArray(images)) {
      await connection.execute('DELETE FROM portfolio_images WHERE portfolio_id = ?', [id]);
      
      for (let i = 0; i < images.length; i++) {
        await connection.execute(
          'INSERT INTO portfolio_images (portfolio_id, image_url, display_order) VALUES (?, ?, ?)',
          [id, images[i], i]
        );
      }
    }
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      message: '포트폴리오가 수정되었습니다.'
    });
  } catch (error) {
    console.error('포트폴리오 수정 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: 포트폴리오 삭제
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    console.log('DELETE 요청 - 사용자:', session.user.username, '역할:', session.user.role);
    
    const { id } = await params;
    const connection = await mysql.createConnection(dbConfig);
    
    // 포트폴리오 소유자 확인
    const [portfolios] = await connection.execute(
      'SELECT designer_id FROM portfolios WHERE id = ?',
      [id]
    );
    
    if (portfolios.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '포트폴리오를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 권한 확인 (본인 또는 관리자만)
    const isOwner = portfolios[0].designer_id === parseInt(session.user.id);
    const isAdmin = session.user.role === 'admin';
    
    console.log('권한 확인 - designer_id:', portfolios[0].designer_id, 'user_id:', session.user.id, 'isOwner:', isOwner, 'isAdmin:', isAdmin);
    
    if (!isOwner && !isAdmin) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '삭제 권한이 없습니다. 소유자 또는 관리자만 삭제할 수 있습니다.' },
        { status: 403 }
      );
    }
    
    // 관련 이미지 먼저 삭제
    await connection.execute('DELETE FROM portfolio_images WHERE portfolio_id = ?', [id]);
    
    // 포트폴리오 삭제
    await connection.execute('DELETE FROM portfolios WHERE id = ?', [id]);
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      message: '포트폴리오가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('포트폴리오 삭제 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
