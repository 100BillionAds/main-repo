import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

// 메모리 기반 사용자 저장소 (실제로는 데이터베이스 사용)
const users = [];

/**
 * POST /api/auth/register - 회원가입
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password, name, email } = body;

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

    // 중복 검사
    const existingUser = users.find((u) => u.username === username || u.email === email);
    if (existingUser) {
      return NextResponse.json(
        { error: '이미 존재하는 사용자 이름 또는 이메일입니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const newUser = {
      id: String(users.length + 3), // admin과 test1234 이후
      username,
      password: hashedPassword,
      name,
      email,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);

    // 비밀번호 제외하고 반환
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(
      {
        success: true,
        message: '회원가입이 완료되었습니다.',
        user: userWithoutPassword,
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
