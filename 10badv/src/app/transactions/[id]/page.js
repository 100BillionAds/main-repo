import TransactionDetail from '@/components/transaction/TransactionDetail';

export async function generateMetadata({ params }) {
  const { id } = await params;
  return {
    title: `거래 상세 | 백억광고`,
    description: '거래 진행 상황 및 상세 정보',
  };
}

export default async function TransactionDetailPage({ params }) {
  const { id } = await params;
  return <TransactionDetail transactionId={id} />;
}
