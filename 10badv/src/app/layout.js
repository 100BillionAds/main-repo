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
