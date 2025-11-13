import Link from 'next/link';

export const metadata = {
  title: 'Projects - 10badv',
  description: 'Manage your projects',
};

// 임시 데이터
const mockProjects = [
  { id: '1', title: 'Project Alpha', description: '첫 번째 프로젝트', status: 'active' },
  { id: '2', title: 'Project Beta', description: '두 번째 프로젝트', status: 'completed' },
  { id: '3', title: 'Project Gamma', description: '세 번째 프로젝트', status: 'planning' },
];

/**
 * Projects 목록 페이지
 */
export default function ProjectsPage() {
  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    planning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Projects</h1>
          <p className="text-zinc-600 dark:text-zinc-400">프로젝트를 관리하고 진행 상황을 확인하세요.</p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
        >
          새 프로젝트
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockProjects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="block rounded-lg border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">{project.title}</h3>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[project.status]}`}
              >
                {project.status}
              </span>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{project.description}</p>
          </Link>
        ))}
      </div>

      {mockProjects.length === 0 && (
        <div className="py-12 text-center">
          <p className="mb-4 text-zinc-600 dark:text-zinc-400">프로젝트가 없습니다.</p>
          <Link
            href="/projects/new"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
          >
            첫 프로젝트 만들기
          </Link>
        </div>
      )}
    </div>
  );
}
