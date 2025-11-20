import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import AdminDashboard from '@/features/admin/components/AdminDashboard';

export const metadata = {
  title: '관리자 대시보드 - 백억광고',
  description: '플랫폼 통계 및 관리 기능',
};

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // 로그인 확인
  if (!session) {
    redirect('/login?callbackUrl=/admin');
  }

  // 관리자 권한 확인
  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  return <AdminDashboard />;
}
