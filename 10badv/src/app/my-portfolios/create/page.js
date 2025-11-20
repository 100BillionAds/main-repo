import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import PortfolioCreateForm from '@/features/portfolio/components/PortfolioCreateForm';

export const metadata = {
  title: '포트폴리오 등록 - 백억광고',
  description: '새로운 포트폴리오를 등록하세요'
};

export default async function CreatePortfolioPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'designer') {
    redirect('/login');
  }
  
  return <PortfolioCreateForm />;
}
