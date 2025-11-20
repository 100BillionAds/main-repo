import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import ChatInterface from '@/features/chat/components/ChatInterface';

export const metadata = {
  title: '채팅 - 백억광고',
  description: '실시간 채팅',
};

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login?callbackUrl=/chat');
  }

  return <ChatInterface />;
}
