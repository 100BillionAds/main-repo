import PortfolioDetail from '@/components/portfolio/PortfolioDetail';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `포트폴리오 #${id} | 백억광고`,
    description: '간판 디자인 포트폴리오 상세 정보',
  };
}

export default async function PortfolioDetailPage({ params }) {
  const { id } = await params;
  return <PortfolioDetail portfolioId={id} />;
}
