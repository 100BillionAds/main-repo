import Link from 'next/link';
import { notFound } from 'next/navigation';

// 임시 데이터
const mockProjects = [
  { id: '1', title: 'Project Alpha', description: '첫 번째 프로젝트', status: 'active' },
  { id: '2', title: 'Project Beta', description: '두 번째 프로젝트', status: 'completed' },
  { id: '3', title: 'Project Gamma', description: '세 번째 프로젝트', status: 'planning' },
];

export async function generateMetadata({ params }) {
  const { id } = await params;
  const project = mockProjects.find((p) => p.id === id);

  if (!project) {
    return {
      title: 'Project Not Found',
    };
  }

  return {
    title: `${project.title} - 10badv`,
    description: project.description,
  };
}

/**
 * Project 상세 페이지 (동적 라우팅)
 */
export default async function ProjectPage({ params }) {
  const { id } = await params;
  const project = mockProjects.find((p) => p.id === id);

  if (!project) {
    notFound();
  }

  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    planning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-6">
        <Link
          href="/projects"
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← 프로젝트 목록으로
        </Link>
      </div>

      <div className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <h1 className="text-3xl font-bold">{project.title}</h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[project.status]}`}
          >
            {project.status}
          </span>
        </div>
        <p className="text-zinc-600 dark:text-zinc-400">{project.description}</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-xl font-semibold">프로젝트 정보</h2>
          <dl className="space-y-3">
            <div className="flex justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <dt className="font-medium">프로젝트 ID</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{project.id}</dd>
            </div>
            <div className="flex justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <dt className="font-medium">상태</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">{project.status}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-medium">생성일</dt>
              <dd className="text-zinc-600 dark:text-zinc-400">2025-11-13</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-xl font-semibold">최근 활동</h2>
          <p className="text-zinc-600 dark:text-zinc-400">최근 활동 내역이 없습니다.</p>
        </div>
      </div>
    </div>
  );
}
