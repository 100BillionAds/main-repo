import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// 인증이 필요한 경로
const protectedPaths = [
  '/dashboard',
  '/chat',
  '/my-page',
  '/my-portfolios',
  '/my-transactions',
  '/payment',
  '/payments',
  '/points',
  '/profile',
];

// 관리자만 접근 가능한 경로
const adminPaths = [
  '/admin',
];

// 비로그인 사용자만 접근 가능한 경로
const authPaths = [
  '/login',
  '/register',
  '/auth/signup',
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // API 라우트는 각 핸들러에서 인증 처리
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 정적 파일 무시
  if (pathname.startsWith('/_next/') || pathname.startsWith('/uploads/') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // 보호된 경로: 인증 필요
  const isProtected = protectedPaths.some(path => pathname.startsWith(path));
  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 관리자 경로: admin 역할 필요
  const isAdmin = adminPaths.some(path => pathname.startsWith(path));
  if (isAdmin) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // 인증 경로: 이미 로그인한 사용자는 대시보드로
  const isAuthPath = authPaths.some(path => pathname.startsWith(path));
  if (isAuthPath && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
