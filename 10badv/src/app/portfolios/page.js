import PortfolioBrowser from '@/features/portfolio/components/PortfolioBrowser';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const metadata = {
  title: '전체 포트폴리오 | 백억광고',
  description: '백억광고의 모든 포트폴리오를 둘러보세요',
};

export default async function PortfoliosPage() {
  const session = await getServerSession(authOptions);
  
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            전체 포트폴리오
          </h1>
          <p className="text-lg text-gray-600">
            승인된 디자이너들의 작품을 만나보세요
          </p>
        </div>
        <PortfolioBrowser session={session} />
      </div>
    </main>
  );
}
