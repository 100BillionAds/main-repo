import Link from 'next/link';

export const metadata = {
  title: 'About - 10badv',
  description: 'Learn more about 10badv workspace',
};

/**
 * About 페이지 - 프로젝트 소개
 */
export default function About() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">About 10badv</h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400">
          A modern workspace for the next generation
        </p>
      </div>

      <div className="mb-12 space-y-6">
        <section>
          <h2 className="mb-4 text-2xl font-semibold">Our Mission</h2>
          <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">
            10badv is designed to empower teams and individuals to organize their work efficiently.
            We believe in creating tools that are both powerful and easy to use, enabling you to
            focus on what matters most - your work.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Key Features</h2>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="mr-3 text-blue-600">✓</span>
              <span className="text-zinc-700 dark:text-zinc-300">
                Intuitive interface with drag-and-drop functionality
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-blue-600">✓</span>
              <span className="text-zinc-700 dark:text-zinc-300">
                Real-time collaboration with team members
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-blue-600">✓</span>
              <span className="text-zinc-700 dark:text-zinc-300">
                Secure authentication and data protection
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-blue-600">✓</span>
              <span className="text-zinc-700 dark:text-zinc-300">
                Dark mode support for comfortable viewing
              </span>
            </li>
            <li className="flex items-start">
              <span className="mr-3 text-blue-600">✓</span>
              <span className="text-zinc-700 dark:text-zinc-300">
                Mobile-responsive design for work on-the-go
              </span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 text-2xl font-semibold">Technology Stack</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="mb-2 font-semibold">Frontend</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Next.js 16, React 19, Tailwind CSS 4
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="mb-2 font-semibold">Authentication</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">NextAuth.js, Prisma</p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="mb-2 font-semibold">Testing</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Jest, React Testing Library
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <h3 className="mb-2 font-semibold">Code Quality</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">ESLint, Prettier</p>
            </div>
          </div>
        </section>
      </div>

      <div className="flex justify-center gap-4">
        <Link
          href="/dashboard"
          className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
        >
          Try Dashboard
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-zinc-300 px-6 py-3 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
