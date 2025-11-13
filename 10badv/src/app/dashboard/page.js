import Link from 'next/link';

export const metadata = {
  title: 'Dashboard - 10badv',
  description: 'Your personal workspace dashboard',
};

/**
 * Dashboard 페이지 - 사용자 대시보드
 */
export default function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Dashboard</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Welcome to your workspace. Manage your projects and tasks here.
        </p>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-2 text-lg font-semibold">Total Projects</h3>
          <p className="text-3xl font-bold text-blue-600">12</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-2 text-lg font-semibold">Active Tasks</h3>
          <p className="text-3xl font-bold text-green-600">28</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-2 text-lg font-semibold">Completed</h3>
          <p className="text-3xl font-bold text-purple-600">145</p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-xl font-semibold">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <div>
              <p className="font-medium">Project Alpha Updated</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">2 hours ago</p>
            </div>
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Updated
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <div>
              <p className="font-medium">New Task Created</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">5 hours ago</p>
            </div>
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
              New
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Task Completed</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">1 day ago</p>
            </div>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              Completed
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Link
          href="/"
          className="rounded-lg border border-zinc-300 px-6 py-2 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
