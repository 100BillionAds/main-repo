import Link from 'next/link';

/**
 * HeroSection - 메인 히어로 섹션 (클레이모피즘 + 구글 SaaS 스타일)
 */
export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 dark:from-zinc-950 dark:via-purple-950/30 dark:to-blue-950/30">
      {/* 파스텔 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-20 h-96 w-96 animate-pulse rounded-full bg-gradient-to-br from-pink-200/40 to-purple-200/40 blur-3xl dark:from-pink-900/20 dark:to-purple-900/20" style={{ animationDuration: '4s' }} />
        <div className="absolute -right-20 top-40 h-80 w-80 animate-pulse rounded-full bg-gradient-to-br from-blue-200/40 to-cyan-200/40 blur-3xl dark:from-blue-900/20 dark:to-cyan-900/20" style={{ animationDuration: '5s' }} />
        <div className="absolute bottom-20 left-1/2 h-72 w-72 -translate-x-1/2 animate-pulse rounded-full bg-gradient-to-br from-violet-200/30 to-indigo-200/30 blur-3xl dark:from-violet-900/20 dark:to-indigo-900/20" style={{ animationDuration: '6s' }} />
      </div>
      
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="text-center">
          {/* 상단 배지 - 클레이모피즘 */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/60 px-5 py-2.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] backdrop-blur-md transition-all hover:scale-105 hover:shadow-[inset_0_3px_6px_rgba(0,0,0,0.1)] dark:bg-zinc-900/60 dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.05)]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-sm font-semibold text-transparent dark:from-purple-400 dark:to-blue-400">
              지금 1,234명의 사용자가 활동 중입니다
            </span>
          </div>

          {/* 메인 제목 - 구글 스타일 */}
          <h1 className="mb-6 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="block bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent transition-all hover:scale-105 dark:from-purple-400 dark:via-pink-400 dark:to-blue-400">
              간판 디자인,
            </span>
            <span className="mt-2 block text-gray-900 dark:text-white">
              이제는 쉽고 빠르게
            </span>
          </h1>

          {/* 서브 제목 */}
          <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400 sm:text-xl">
            전문 디자이너와 간판 제작자를 연결하는 플랫폼
            <br className="hidden sm:inline" />
            포트폴리오 거래부터 맞춤 의뢰까지, 한 곳에서 해결하세요
          </p>

          {/* CTA 버튼 - 클레이모피즘 */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-purple-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/40 sm:w-auto dark:shadow-purple-900/50 dark:hover:shadow-purple-900/60"
            >
              <span>무료로 시작하기</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/demo"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-white/80 px-8 py-4 text-base font-semibold text-gray-700 shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] backdrop-blur-sm transition-all hover:bg-white hover:shadow-[inset_0_2px_12px_rgba(0,0,0,0.1)] sm:w-auto dark:bg-zinc-900/60 dark:text-gray-300 dark:shadow-[inset_0_2px_8px_rgba(255,255,255,0.05)] dark:hover:bg-zinc-900/80"
            >
              둘러보기
            </Link>
          </div>

          {/* 신뢰 지표 */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2 transition-transform hover:scale-110">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 shadow-sm transition-all hover:shadow-md dark:from-green-900/30 dark:to-emerald-900/30">
                <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="font-medium">무료 회원가입</span>
            </div>
            <div className="flex items-center gap-2 transition-transform hover:scale-110">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 shadow-sm transition-all hover:shadow-md dark:from-blue-900/30 dark:to-cyan-900/30">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="font-medium">안전한 거래 보장</span>
            </div>
            <div className="flex items-center gap-2 transition-transform hover:scale-110">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 shadow-sm transition-all hover:shadow-md dark:from-purple-900/30 dark:to-pink-900/30">
                <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="font-medium">24시간 고객지원</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
