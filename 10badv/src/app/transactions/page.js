'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TransactionList from '@/components/transaction/TransactionList';

export default function TransactionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    // 관리자가 아니면 접근 불가
    if (session.user.role !== 'admin') {
      alert('관리자만 접근할 수 있습니다.');
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  if (status === 'loading' || !session || session.user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🔐</span>
            <h1 className="text-4xl font-bold text-gray-900">
              관리자 거래 현황
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            전체 거래 내역을 관리하고 모니터링하세요
          </p>
        </div>
        <TransactionList showAll={true} />
      </div>
    </main>
  );
}
