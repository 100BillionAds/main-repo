import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import SessionWrapper from '@/components/SessionWrapper';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata = {
  title: '백억광고 - 간판 디자인 매칭 플랫폼',
  description: '간판업자와 디자이너를 연결하는 디자인 매칭 마켓플레이스',
  keywords: ['간판', '디자인', '포트폴리오', '매칭', '백억광고'],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionWrapper>
          {/* Accessibility: skip to content link */}
          <a href="#content" className="sr-only focus:not-sr-only">
            Skip to content
          </a>

          <Header />

          <main id="content" className="min-h-[70vh]">
            {children}
          </main>

          <Footer />
        </SessionWrapper>
      </body>
    </html>
  );
}
