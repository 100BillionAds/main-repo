import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import PaymentForm from '@/features/payment/components/PaymentForm';

export const metadata = {
  title: '결제 - 백억광고',
  description: '안전한 결제 시스템',
};

export default async function PaymentPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login?callbackUrl=/payment');
  }

  return <PaymentForm />;
}
