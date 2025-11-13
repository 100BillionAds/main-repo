'use client';

import { SessionProvider } from 'next-auth/react';

/**
 * SessionWrapper는 NextAuth의 SessionProvider를 감싸는 클라이언트 컴포넌트입니다.
 * 이를 통해 서버 컴포넌트에서 세션 관리를 할 수 있습니다.
 */
export default function SessionWrapper({ children }) {
  return <SessionProvider>{children}</SessionProvider>;
}
