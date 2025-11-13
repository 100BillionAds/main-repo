import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';

export default async function AuthGuard({ children }) {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }
  return <>{children}</>;
}
