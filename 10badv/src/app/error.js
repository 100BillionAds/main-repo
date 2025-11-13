'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';

/**
 * Error 페이지 - 에러 발생 시 표시
 */
export default function Error({ error, reset }) {
  useEffect(() => {
    // 에러 로깅 (실제로는 Sentry 등의 서비스 사용)
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="text-center">
        <div className="mb-6 text-6xl">⚠️</div>
        <h2 className="mb-4 text-2xl font-semibold">문제가 발생했습니다</h2>
        <p className="mb-8 text-zinc-600 dark:text-zinc-400">
          일시적인 오류가 발생했습니다. 다시 시도해 주세요.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={reset} variant="primary">
            다시 시도
          </Button>
          <Button onClick={() => (window.location.href = '/')} variant="outline">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    </div>
  );
}
