import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import pool from '@/lib/db';
import { getUserByUsername, getUserByEmail, createUser, initializeDatabase } from '@/lib/db';

// 데이터베이스 초기화
initializeDatabase().then(success => {
  if (success) {
    // DB 초기화 완료
  }
});

// 허용된 역할 (admin은 API를 통해 가입 불가)
const ALLOWED_ROLES = ['user', 'designer'];

/**
 * POST /api/auth/register - 회원가입
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password, name, email, role = 'user', avatar_url = null } = body;

    // 유효성 검사
    if (!username || !password || !name || !email) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    if (username.length < 4) {
      return NextResponse.json(
        { error: '사용자 이름은 최소 4자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '비밀번호는 최소 6자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 역할 검증 (admin 가입 차단)
    const safeRole = ALLOWED_ROLES.includes(role) ? role : 'user';

    // 사용자명 중복 검사
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: '이미 존재하는 사용자 이름입니다.' },
        { status: 400 }
      );
    }

    // 이메일 중복 검사
    const existingEmail = await getUserByEmail(email);
    if (existingEmail) {
      return NextResponse.json(
        { error: '이미 사용 중인 이메일입니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 12);

    // MySQL에 사용자 생성
    const newUser = await createUser({
      username,
      password: hashedPassword,
      name,
      email,
      role: safeRole,
      avatar_url: avatar_url,
    });

    return NextResponse.json(
      {
        success: true,
        message: '회원가입이 완료되었습니다.',
        user: {
          id: newUser.id,
          username: newUser.username,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          avatar_url: newUser.avatar_url,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
