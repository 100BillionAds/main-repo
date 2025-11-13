'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Header 컴포넌트 - 사이트 전역 헤더
 * 네비게이션과 로고를 포함합니다.
 */
export default function Header() {
  const pathname = usePathname();

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
        </nav>
      </div>
    </header>
  );
}
