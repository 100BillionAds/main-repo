import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import MyPortfolioList from '@/features/portfolio/components/MyPortfolioList';

export const metadata = {
  title: '내 포트폴리오 - 백억광고',
  description: '내 포트폴리오 관리',
};

export default async function MyPortfoliosPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'designer') {
    redirect('/login');
  }

  return <MyPortfolioList />;
}
