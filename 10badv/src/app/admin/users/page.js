import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import UserManagement from '@/features/admin/components/UserManagement';

export const metadata = {
  title: '회원 관리 - 관리자',
  description: '플랫폼 회원 관리',
};

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'admin') {
    redirect('/login');
  }

  return <UserManagement />;
}
