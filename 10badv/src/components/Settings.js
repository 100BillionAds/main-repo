'use client';

import { useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToggle } from '@/hooks/useToggle';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

/**
 * Settings 컴포넌트 - 사용자 설정 관리
 */
export default function Settings() {
  const [username, setUsername] = useLocalStorage('username', '');
  const [email, setEmail] = useLocalStorage('email', '');
  const [notifications, toggleNotifications] = useToggle(true);
  const [darkMode, toggleDarkMode] = useToggle(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    // 실제로는 서버에 저장
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-bold">Settings</h2>
        <p className="text-zinc-600 dark:text-zinc-400">사용자 설정을 관리하세요.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card title="프로필 정보">
          <div className="space-y-4">
            <Input
              label="사용자 이름"
              placeholder="이름을 입력하세요"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              label="이메일"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </Card>

        <Card title="환경 설정">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">알림 받기</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  중요한 업데이트 알림을 받습니다
                </p>
              </div>
              <button
                type="button"
                onClick={toggleNotifications}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  notifications ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    notifications ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">다크 모드</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  어두운 테마를 사용합니다
                </p>
              </div>
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  darkMode ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" variant="primary">
            저장
          </Button>
          {saved && (
            <div className="flex items-center text-green-600 dark:text-green-400">
              ✓ 저장되었습니다
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
