'use client';
import { useSession, signOut } from 'next-auth/react';

export default function Sidebar({ className = '' }) {
  const { data: session } = useSession();

  return (
    <aside className={`hidden md:block w-64 bg-white/80 dark:bg-black/80 border-r border-zinc-200 dark:border-zinc-800 ${className}`}>
      <div className="p-4 sticky top-0">
        <div className="mb-6">
          <div className="text-sm text-zinc-500 mb-2">Workspace</div>
          <div className="text-lg font-semibold">{session?.user?.name || 'User'}</div>
        </div>
        <div className="space-y-1">
          <a className="block rounded px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 transition" href="/dashboard">
            📝 Quick Notes
          </a>
          <a className="block rounded px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 transition" href="/dashboard">
            📂 Projects
          </a>
          <a className="block rounded px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 transition" href="/dashboard">
            ⚙️ Settings
          </a>
        </div>
        {session && (
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="mt-6 w-full rounded px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
          >
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
