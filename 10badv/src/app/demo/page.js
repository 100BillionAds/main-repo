import TaskList from '@/components/TaskList';
import Settings from '@/components/Settings';

export const metadata = {
  title: 'Demo - 10badv',
  description: 'Interactive demo page',
};

/**
 * Demo 페이지 - 인터랙티브 데모
 */
export default function DemoPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Interactive Demo</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          다양한 기능들을 직접 체험해보세요.
        </p>
      </div>

      <div className="space-y-12">
        <section>
          <TaskList />
        </section>

        <hr className="border-zinc-200 dark:border-zinc-800" />

        <section>
          <Settings />
        </section>
      </div>
    </div>
  );
}
