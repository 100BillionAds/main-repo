/**
 * Footer 컴포넌트 - 사이트 전역 푸터
 * 저작권 및 추가 정보를 표시합니다.
 */
export default function Footer() {
  return (
    <footer className="w-full border-t bg-white/60 py-6 dark:bg-black/60">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-zinc-600 dark:text-zinc-400 md:flex-row">
          <div>© {new Date().getFullYear()} 100BillionAds — Built with Next.js</div>
          <div className="flex gap-4">
            <a
              href="https://github.com/100BillionAds"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            >
              GitHub
            </a>
            <a
              href="/privacy"
              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            >
              Privacy
            </a>
            <a
              href="/terms"
              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
