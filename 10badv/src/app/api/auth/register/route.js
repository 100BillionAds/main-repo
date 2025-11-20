import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getUserByUsername, createUser, getAllUsers, initializeDatabase } from '@/lib/db';

// 데이터베이스 초기화
initializeDatabase().then(success => {
  if (success) {
    console.log('✅ 데이터베이스 초기화 완료');
  }
});

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

    if (password.length < 4) {
      return NextResponse.json(
        { error: '비밀번호는 최소 4자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 중복 검사 (MySQL에서)
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: '이미 존재하는 사용자 이름입니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // MySQL에 사용자 생성
    const newUser = await createUser({
      username,
      password: hashedPassword,
      name,
      email,
      role: role || 'user',
      avatar_url: avatar_url,
    });

    console.log('✅ 회원가입 성공:', username, '(역할:', role, ')');

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
    console.error('❌ Register error:', error);
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/register - 사용자 목록 조회 (관리자용)
 */
export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('❌ Get users error:', error);
    return NextResponse.json(
      { error: '사용자 목록 조회 실패' },
      { status: 500 }
    );
  }
}
