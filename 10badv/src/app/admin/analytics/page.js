import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import AnalyticsDashboard from '@/features/admin/components/AnalyticsDashboard';

export const metadata = {
  title: '분석 리포트 - 관리자',
  description: '플랫폼 통계 분석',
};

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  return <AnalyticsDashboard />;
}
