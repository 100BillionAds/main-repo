import Sidebar from '@/src/components/Sidebar';
import dynamic from 'next/dynamic';

const Editor = dynamic(() => import('@/src/components/Editor'), { ssr: false });

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 px-4 py-8">
        <Sidebar />
        <div className="bg-white/80 dark:bg-black/80 rounded-lg border">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-lg font-semibold">Your Notes</h2>
            <div className="text-sm text-zinc-500">All changes saved</div>
          </div>
          <Editor />
        </div>
      </div>
    </div>
  );
}
