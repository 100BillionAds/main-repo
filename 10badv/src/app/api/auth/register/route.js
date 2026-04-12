import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { getUserByUsername, getUserByEmail, createUser, initializeDatabase } from '@/lib/db';
import { checkRateLimit } from '@/lib/rateLimit';

// 데이터베이스 초기화
initializeDatabase().then(success => {
  if (success) {
    // DB 초기화 완료
  }
});

// 허용된 역할 (admin은 API를 통해 가입 불가)
const ALLOWED_ROLES = ['user', 'designer'];
const REQUIRED_DATABASE_ENV = ['DATABASE_HOST', 'DATABASE_USER', 'DATABASE_NAME'];
const DATABASE_ERROR_CODES = new Set([
  'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
]);

function getMissingDatabaseEnv() {
  return REQUIRED_DATABASE_ENV.filter((key) => !process.env[key]);
}

/**
 * POST /api/auth/register - 회원가입
 */
export async function POST(request) {
  try {
    // Rate Limiting: 분당 5회 (회원가입 남용 방지)
    const { allowed, headers: rlHeaders } = checkRateLimit(request, { limit: 5, windowMs: 60 * 1000 });
    if (!allowed) {
      return NextResponse.json(
        { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
        { status: 429, headers: rlHeaders }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: '요청 본문(JSON) 형식이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const missingDatabaseEnv = getMissingDatabaseEnv();
    if (process.env.NODE_ENV === 'production' && missingDatabaseEnv.length > 0) {
      console.error('Register blocked: missing database env', missingDatabaseEnv);
      return NextResponse.json(
        { error: '현재 회원가입을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 }
      );
    }

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

    if (password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 최소 8자 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 비밀번호 복잡도 검증 (영문 + 숫자 + 특수문자)
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    if (!hasLetter || !hasNumber || !hasSpecial) {
      return NextResponse.json(
        { error: '비밀번호는 영문, 숫자, 특수문자를 각각 1개 이상 포함해야 합니다.' },
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

    if (error && DATABASE_ERROR_CODES.has(error.code)) {
      return NextResponse.json(
        { error: '현재 회원가입을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
