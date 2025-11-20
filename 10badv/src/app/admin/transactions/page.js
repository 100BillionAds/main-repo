import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import TransactionManagement from '@/features/admin/components/TransactionManagement';

export const metadata = {
  title: '거래 관리 - 관리자',
  description: '거래 내역 조회 및 관리',
};

export default async function AdminTransactionsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  return <TransactionManagement />;
}
