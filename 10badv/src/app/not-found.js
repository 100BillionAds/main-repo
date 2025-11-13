import Link from 'next/link';

/**
 * 404 Not Found 페이지
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-zinc-900 dark:text-zinc-50">404</h1>
        <h2 className="mb-6 text-2xl font-semibold">Page Not Found</h2>
        <p className="mb-8 text-zinc-600 dark:text-zinc-400">
          죄송합니다. 요청하신 페이지를 찾을 수 없습니다.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            홈으로 돌아가기
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-300 px-6 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            대시보드로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
