import DesignerGrid from '@/components/designer/DesignerGrid';

export const metadata = {
  title: '전체 디자이너 | 백억광고',
  description: '백억광고의 우수 디자이너들을 만나보세요',
};

export default function DesignersPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            우수 디자이너
          </h1>
          <p className="text-lg text-gray-600">
            검증된 전문 디자이너들과 함께 프로젝트를 시작하세요
          </p>
        </div>
        <DesignerGrid showAll={true} />
      </div>
    </main>
  );
}
