'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

/**
 * Login 페이지 - 사용자 로그인
 */
export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        username: formData.username,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (username, password) => {
    setFormData({ username, password });
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-900">
      <div className="w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">로그인</h1>
          <p className="text-zinc-600 dark:text-zinc-400">계정에 로그인하세요</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
                {error}
              </div>
            )}

            <Input
              label="사용자 이름"
              type="text"
              placeholder="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />

            <Input
              label="비밀번호"
              type="password"
              placeholder="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
            />

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </Button>
          </form>

          <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              테스트 계정으로 로그인:
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin', 'admin')}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-left text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <div className="font-medium">관리자 계정</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  Username: admin / Password: admin
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('test1234', '1234')}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-left text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                <div className="font-medium">테스트 계정</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  Username: test1234 / Password: 1234
                </div>
              </button>
            </div>
          </div>
        </Card>

        <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          계정이 없으신가요?{' '}
          <a href="/register" className="font-medium text-blue-600 hover:underline">
            회원가입
          </a>
        </div>
      </div>
    </div>
  );
}
