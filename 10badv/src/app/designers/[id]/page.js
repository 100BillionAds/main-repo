import DesignerProfile from '@/components/designer/DesignerProfile';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `디자이너 프로필 | 백억광고`,
    description: '디자이너 상세 정보 및 포트폴리오',
  };
}

export default async function DesignerProfilePage({ params }) {
  const { id } = await params;
  return <DesignerProfile designerId={id} />;
}
