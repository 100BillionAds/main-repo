'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/utils/api';
import Card from '@/components/ui/Card';
import Loading from '@/components/ui/Loading';
import { getRelativeTime } from '@/utils/helpers';

/**
 * TaskList 컴포넌트 - 태스크 목록 표시
 */
export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await apiGet('/api/tasks');
      if (response.success) {
        setTasks(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading text="태스크를 불러오는 중..." />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
        오류: {error}
      </div>
    );
  }

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  };

  const priorityColors = {
    low: 'text-zinc-600 dark:text-zinc-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    high: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tasks</h2>
        <button
          onClick={fetchTasks}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          새로고침
        </button>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <p className="text-center text-zinc-600 dark:text-zinc-400">태스크가 없습니다.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{task.title}</h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[task.status]}`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`font-medium ${priorityColors[task.priority]}`}>
                      우선순위: {task.priority}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {getRelativeTime(task.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
