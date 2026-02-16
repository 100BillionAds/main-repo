import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';

// GET: 현재 사용자 정보 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const [users] = await pool.execute(
      'SELECT id, name, email, username, role, points, avatar_url, bio, phone, created_at FROM users WHERE id = ?',
      [session.user.id]
    );

    if (users.length === 0) {
      return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: users[0] });
  } catch (error) {
    console.error('사용자 정보 조회 실패:', error);
    return NextResponse.json({ success: false, error: '사용자 정보 조회에 실패했습니다.' }, { status: 500 });
  }
}

// PUT: 사용자 정보 수정
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { name, bio, phone, currentPassword, newPassword, avatar_url } = body;

    // 비밀번호 변경 요청인 경우
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ success: false, error: '현재 비밀번호를 입력해주세요.' }, { status: 400 });
      }

      if (newPassword.length < 4) {
        return NextResponse.json({ success: false, error: '새 비밀번호는 최소 4자 이상이어야 합니다.' }, { status: 400 });
      }

      const [users] = await pool.execute(
        'SELECT password FROM users WHERE id = ?',
        [session.user.id]
      );

      if (users.length === 0) {
        return NextResponse.json({ success: false, error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password);
      if (!isPasswordValid) {
        return NextResponse.json({ success: false, error: '현재 비밀번호가 일치하지 않습니다.' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const fields = [];
      const values = [];

      if (name !== undefined) { fields.push('name = ?'); values.push(name); }
      if (bio !== undefined) { fields.push('bio = ?'); values.push(bio); }
      if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
      if (avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(avatar_url); }
      fields.push('password = ?');
      values.push(hashedPassword);

      values.push(session.user.id);
      await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    } else {
      const fields = [];
      const values = [];

      if (name !== undefined) { fields.push('name = ?'); values.push(name); }
      if (bio !== undefined) { fields.push('bio = ?'); values.push(bio); }
      if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
      if (avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(avatar_url); }

      if (fields.length > 0) {
        values.push(session.user.id);
        await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
      }
    }

    // 업데이트된 사용자 정보 조회
    const [updatedUsers] = await pool.execute(
      'SELECT id, name, email, username, role, points, avatar_url, bio, phone, created_at FROM users WHERE id = ?',
      [session.user.id]
    );

    return NextResponse.json({
      success: true,
      message: '프로필이 성공적으로 업데이트되었습니다.',
      user: updatedUsers[0]
    });
  } catch (error) {
    console.error('프로필 업데이트 실패:', error);
    return NextResponse.json({ success: false, error: '프로필 업데이트에 실패했습니다.' }, { status: 500 });
  }
}
