import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import SessionWrapper from '@/src/components/SessionWrapper';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata = {
  title: '10badv - Your Notion-like Workspace',
  description: 'A modern workspace for notes and collaboration',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionWrapper>
          {/* Accessibility: skip to content link */}
          <a href="#content" className="sr-only focus:not-sr-only">
            Skip to content
          </a>

          <header className="w-full border-b bg-white/60 backdrop-blur-sm dark:bg-black/60">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
              <div className="text-lg font-semibold">10badv</div>
              <nav>
                <a className="mr-4 text-sm" href="/">
                  Home
                </a>
                <a className="text-sm" href="/dashboard">
                  Dashboard
                </a>
              </nav>
            </div>
          </header>

          <main id="content" className="min-h-[70vh]">
            {children}
          </main>

          <footer className="w-full border-t bg-white/60 py-6 dark:bg-black/60">
            <div className="mx-auto max-w-6xl px-6 text-sm text-zinc-600 dark:text-zinc-400">
              © {new Date().getFullYear()} 100BillionAds — Built with Next.js
            </div>
          </footer>
        </SessionWrapper>
      </body>
    </html>
  );
}
