import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || 'merk',
  database: process.env.DATABASE_NAME || '10badv'
};

/**
 * GET /api/admin/users - 모든 사용자 조회 (포트폴리오, 거래 건수 포함)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    const connection = await mysql.createConnection(dbConfig);
    
    const [users] = await connection.execute(`
      SELECT 
        u.id,
        u.username,
        u.name,
        u.email,
        u.role,
        u.points,
        u.rating,
        u.review_count,
        u.status,
        u.created_at,
        (SELECT COUNT(*) FROM portfolios WHERE designer_id = u.id) as portfolio_count,
        (SELECT COUNT(*) FROM transactions WHERE buyer_id = u.id OR designer_id = u.id) as transaction_count
      FROM users u
      ORDER BY u.created_at DESC
    `);
    
    await connection.end();
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('❌ Get users error:', error);
    return NextResponse.json(
      { error: '사용자 목록 조회 실패' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users - 사용자 정보 수정 (역할, 상태 변경)
 */
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    const { userId, updates } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);
    
    // 업데이트할 필드 구성
    const fields = [];
    const values = [];
    
    if (updates.role) {
      fields.push('role = ?');
      values.push(updates.role);
    }
    
    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    
    if (fields.length === 0) {
      await connection.end();
      return NextResponse.json({ error: '업데이트할 내용이 없습니다' }, { status: 400 });
    }
    
    values.push(userId);
    
    await connection.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    await connection.end();

    return NextResponse.json({ success: true, message: '사용자 정보가 수정되었습니다' });
  } catch (error) {
    console.error('❌ Update user error:', error);
    return NextResponse.json(
      { error: '사용자 정보 수정 중 오류 발생' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users - 사용자 삭제
 */
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 ID가 필요합니다' },
        { status: 400 }
      );
    }

    const connection = await mysql.createConnection(dbConfig);
    
    // 사용자 삭제
    await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
    
    await connection.end();

    return NextResponse.json({ success: true, message: '사용자가 삭제되었습니다' });
  } catch (error) {
    console.error('❌ Delete user error:', error);
    return NextResponse.json(
      { error: '사용자 삭제 중 오류 발생' },
      { status: 500 }
    );
  }
}
