import Loading from '@/components/ui/Loading';

/**
 * Loading 페이지 - 페이지 로딩 중 표시
 */
export default function LoadingPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Loading size="lg" text="페이지를 불러오는 중..." />
    </div>
  );
}
