import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import PortfolioApproval from '@/features/admin/components/PortfolioApproval';

export const metadata = {
  title: '포트폴리오 승인 관리 - 백억광고',
  description: '디자이너가 등록한 포트폴리오를 승인하거나 거부합니다'
};

export default async function AdminPortfolioPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }
  
  return <PortfolioApproval />;
}
