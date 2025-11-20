import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

// MySQL 연결 설정
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'merk',
  database: '10badv'
};

// GET: 현재 사용자 정보 조회
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    const [users] = await connection.execute(
      'SELECT id, name, email, username, role, points, avatar_url, bio, phone, created_at FROM users WHERE id = ?',
      [session.user.id]
    );
    
    await connection.end();
    
    if (users.length === 0) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT: 사용자 정보 수정
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const { name, username, bio, phone, currentPassword, newPassword, avatar_url } = await request.json();
    
    const connection = await mysql.createConnection(dbConfig);
    
    // 비밀번호 변경 요청인 경우
    if (newPassword) {
      if (!currentPassword) {
        await connection.end();
        return NextResponse.json(
          { success: false, error: '현재 비밀번호를 입력해주세요.' },
          { status: 400 }
        );
      }
      
      // 현재 비밀번호 확인
      const [users] = await connection.execute(
        'SELECT password FROM users WHERE id = ?',
        [session.user.id]
      );
      
      if (users.length === 0) {
        await connection.end();
        return NextResponse.json(
          { success: false, error: '사용자를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
      
      if (!isPasswordValid) {
        await connection.end();
        return NextResponse.json(
          { success: false, error: '현재 비밀번호가 일치하지 않습니다.' },
          { status: 400 }
        );
      }
      
      // 새 비밀번호 해시화
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // 비밀번호 포함 업데이트
      await connection.execute(
        'UPDATE users SET email = ?, bio = ?, phone = ?, password = ?, avatar_url = ? WHERE id = ?',
        [username, bio, phone, hashedPassword, avatar_url, session.user.id]
      );
    } else {
      // 비밀번호 제외 업데이트
      await connection.execute(
        'UPDATE users SET email = ?, bio = ?, phone = ?, avatar_url = ? WHERE id = ?',
        [username, bio, phone, avatar_url, session.user.id]
      );
    }
    
    // 업데이트된 사용자 정보 조회
    const [updatedUsers] = await connection.execute(
      'SELECT id, name, email, username, role, points, bio, phone, created_at FROM users WHERE id = ?',
      [session.user.id]
    );
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      message: '프로필이 성공적으로 업데이트되었습니다.',
      user: updatedUsers[0]
    });
  } catch (error) {
    console.error('프로필 업데이트 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
