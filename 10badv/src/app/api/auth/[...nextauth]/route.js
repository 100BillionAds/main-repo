import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcrypt';

// 메모리 기반 사용자 데이터 (실제로는 데이터베이스 사용)
const users = [
  {
    id: '1',
    username: 'admin',
    password: '$2b$10$YourHashedPasswordHere', // 'admin' hashed
    name: 'Administrator',
    email: 'admin@10badv.com',
    role: 'admin',
  },
  {
    id: '2',
    username: 'test1234',
    password: '$2b$10$YourHashedPasswordHere2', // '1234' hashed
    name: 'Test User',
    email: 'test@10badv.com',
    role: 'user',
  },
];

// 초기화 시 비밀번호 해싱 (실제로는 데이터베이스에 이미 해싱되어 저장됨)
async function initUsers() {
  users[0].password = await bcrypt.hash('admin', 10);
  users[1].password = await bcrypt.hash('1234', 10);
}

// 서버 시작 시 사용자 초기화
initUsers();

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
          throw new Error('Please enter username and password');
        }

        // 사용자 찾기
        const user = users.find((u) => u.username === credentials.username);

        if (!user) {
          throw new Error('No user found with this username');
        }

        // 비밀번호 검증
        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Invalid password');
        }

        // 비밀번호 제외하고 반환
        return {
          id: user.id,
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
