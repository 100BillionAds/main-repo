'use client';
import Sidebar from '@/src/components/Sidebar';
import AuthGuard from '@/src/components/AuthGuard';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@/src/components/Editor'), { ssr: false });

export default function DashboardPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-7xl flex gap-0 h-full">
          <Sidebar />
          <div className="flex-1 bg-white dark:bg-zinc-900 rounded-none md:rounded-l-xl border-l md:border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 bg-white dark:bg-zinc-900">
              <h2 className="text-lg font-semibold">Your Notes</h2>
              <div className="text-xs text-zinc-500">Auto-saved</div>
            </div>
            <Editor />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
