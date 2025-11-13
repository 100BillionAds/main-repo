import Link from 'next/link';

/**
 * Home 페이지 - 메인 랜딩 페이지
 */
export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-900">
      <div className="w-full max-w-4xl px-6 py-16 text-center">
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 md:text-6xl">
          Welcome to <span className="text-blue-600 dark:text-blue-500">10badv</span>
        </h1>
        <p className="mx-auto mb-12 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          A modern workspace designed for productivity and collaboration. Build, organize, and share
          your ideas seamlessly.
        </p>

        <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/dashboard"
            className="flex h-12 w-full items-center justify-center rounded-lg bg-blue-600 px-8 text-base font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
          >
            Get Started
          </Link>
          <Link
            href="/about"
            className="flex h-12 w-full items-center justify-center rounded-lg border border-zinc-300 px-8 text-base font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 sm:w-auto"
          >
            Learn More
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 text-3xl">🚀</div>
            <h3 className="mb-2 text-xl font-semibold">Fast & Modern</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Built with Next.js 16 for optimal performance and developer experience.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 text-3xl">🎨</div>
            <h3 className="mb-2 text-xl font-semibold">Beautiful UI</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Elegant design with dark mode support and smooth animations.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 text-3xl">🔒</div>
            <h3 className="mb-2 text-xl font-semibold">Secure</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Authentication ready with NextAuth for secure user management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
