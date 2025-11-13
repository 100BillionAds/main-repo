'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

/**
 * Header 컴포넌트 - 사이트 전역 헤더
 * 네비게이션과 로고를 포함합니다.
 */
export default function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isActive = (path) => pathname === path;

  return (
    <header className="w-full border-b bg-white/60 backdrop-blur-sm dark:bg-black/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="text-lg font-semibold hover:opacity-80 transition-opacity">
          10badv
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className={`text-sm transition-colors ${
              isActive('/') ? 'font-semibold' : 'hover:text-zinc-600 dark:hover:text-zinc-400'
            }`}
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className={`text-sm transition-colors ${
              isActive('/dashboard')
                ? 'font-semibold'
                : 'hover:text-zinc-600 dark:hover:text-zinc-400'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/projects"
            className={`text-sm transition-colors ${
              isActive('/projects') || pathname?.startsWith('/projects/')
                ? 'font-semibold'
                : 'hover:text-zinc-600 dark:hover:text-zinc-400'
            }`}
          >
            Projects
          </Link>
          <Link
            href="/demo"
            className={`text-sm transition-colors ${
              isActive('/demo')
                ? 'font-semibold'
                : 'hover:text-zinc-600 dark:hover:text-zinc-400'
            }`}
          >
            Demo
          </Link>
          <Link
            href="/about"
            className={`text-sm transition-colors ${
              isActive('/about')
                ? 'font-semibold'
                : 'hover:text-zinc-600 dark:hover:text-zinc-400'
            }`}
          >
            About
          </Link>

          <div className="ml-4 border-l border-zinc-300 pl-4 dark:border-zinc-700">
            {status === 'loading' ? (
              <span className="text-sm text-zinc-400">...</span>
            ) : session ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {session.user?.name}
                  {session.user?.role === 'admin' && (
                    <span className="ml-2 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Admin
                    </span>
                  )}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                로그인
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
