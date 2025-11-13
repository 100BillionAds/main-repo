'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

/**
 * Register 페이지 - 회원가입
 */
export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!formData.username || formData.username.length < 4) {
      newErrors.username = '사용자 이름은 최소 4자 이상이어야 합니다.';
    }

    if (!formData.password || formData.password.length < 4) {
      newErrors.password = '비밀번호는 최소 4자 이상이어야 합니다.';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
    }

    if (!formData.name) {
      newErrors.name = '이름을 입력해주세요.';
    }

    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '올바른 이메일 주소를 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      // 실제로는 서버 API 호출
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          name: formData.name,
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // 자동 로그인
        await signIn('credentials', {
          username: formData.username,
          password: formData.password,
          redirect: false,
        });
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setErrors({ general: data.error || '회원가입에 실패했습니다.' });
      }
    } catch (err) {
      setErrors({ general: '서버 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <div className="mb-4 text-6xl">✓</div>
          <h2 className="mb-2 text-2xl font-bold text-green-600">회원가입 완료!</h2>
          <p className="text-zinc-600 dark:text-zinc-400">대시보드로 이동합니다...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-900">
      <div className="w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">회원가입</h1>
          <p className="text-zinc-600 dark:text-zinc-400">새로운 계정을 만드세요</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
                {errors.general}
              </div>
            )}

            <Input
              label="사용자 이름"
              type="text"
              placeholder="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              error={errors.username}
              required
            />

            <Input
              label="이름"
              type="text"
              placeholder="홍길동"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={errors.name}
              required
            />

            <Input
              label="이메일"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              required
            />

            <Input
              label="비밀번호"
              type="password"
              placeholder="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              error={errors.password}
              required
            />

            <Input
              label="비밀번호 확인"
              type="password"
              placeholder="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              error={errors.confirmPassword}
              required
            />

            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? '처리 중...' : '회원가입'}
            </Button>
          </form>
        </Card>

        <div className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          이미 계정이 있으신가요?{' '}
          <a href="/login" className="font-medium text-blue-600 hover:underline">
            로그인
          </a>
        </div>
      </div>
    </div>
  );
}
