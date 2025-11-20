import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';
import { getUserByUsername } from '@/lib/db';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.log('❌ 로그인 실패: 아이디/비밀번호 미입력');
          throw new Error('Please enter username and password');
        }

        // MySQL에서 사용자 찾기
        const user = await getUserByUsername(credentials.username);

        if (!user) {
          console.log('❌ 로그인 실패: 사용자를 찾을 수 없음 -', credentials.username);
          throw new Error('No user found with this username');
        }

        // 비밀번호 검증 (개발용: 평문 비교)
        const isValid = credentials.password === user.password;

        if (!isValid) {
          console.log('❌ 로그인 실패: 비밀번호 불일치 -', credentials.username);
          throw new Error('Invalid password');
        }

        console.log('✅ 로그인 성공:', user.username, '(역할:', user.role, ')');

        // 비밀번호 제외하고 반환
        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
