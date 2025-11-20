'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PaymentHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, completed, pending, failed, cancelled

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session) {
      fetchPayments();
    }
  }, [session, status, filter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`/api/payments${statusParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPayments(data.payments || []);
        }
      }
    } catch (error) {
      console.error('결제 내역 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { text: '완료', color: 'bg-green-100 text-green-800' },
      pending: { text: '대기', color: 'bg-yellow-100 text-yellow-800' },
      failed: { text: '실패', color: 'bg-red-100 text-red-800' },
      cancelled: { text: '취소', color: 'bg-gray-100 text-gray-800' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      card: '신용/체크카드',
      trans: '계좌이체',
      vbank: '가상계좌',
      phone: '휴대폰',
      kakaopay: '카카오페이',
      naverpay: '네이버페이'
    };
    return labels[method] || method;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">결제 내역</h1>
              <p className="mt-2 text-gray-600">포인트 충전 및 결제 내역을 확인하세요</p>
            </div>
            <Link
              href="/points/charge"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
              포인트 충전하기
            </Link>
          </div>

          {/* 필터 탭 */}
          <div className="mb-6 flex gap-2 border-b border-gray-200">
            {[
              { value: 'all', label: '전체' },
              { value: 'completed', label: '완료' },
              { value: 'pending', label: '대기' },
              { value: 'failed', label: '실패' },
              { value: 'cancelled', label: '취소' }
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-4 py-2 font-semibold transition-all ${
                  filter === tab.value
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 결제 내역 리스트 */}
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💳</div>
              <p className="text-gray-500 text-lg">결제 내역이 없습니다.</p>
              <Link
                href="/points/charge"
                className="inline-block mt-4 text-blue-600 hover:underline"
              >
                포인트 충전하러 가기 →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {payment.order_name}
                        </h3>
                        {getStatusBadge(payment.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">주문번호:</span>{' '}
                          <span className="font-mono text-xs">{payment.merchant_uid}</span>
                        </div>
                        {payment.imp_uid && (
                          <div>
                            <span className="font-medium">결제번호:</span>{' '}
                            <span className="font-mono text-xs">{payment.imp_uid}</span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium">결제수단:</span>{' '}
                          {getPaymentMethodLabel(payment.payment_method)}
                        </div>
                        {payment.card_name && (
                          <div>
                            <span className="font-medium">카드:</span> {payment.card_name}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">결제일시:</span>{' '}
                          {payment.paid_at
                            ? new Date(payment.paid_at).toLocaleString('ko-KR')
                            : new Date(payment.created_at).toLocaleString('ko-KR')}
                        </div>
                        {payment.pg_provider && (
                          <div>
                            <span className="font-medium">PG사:</span> {payment.pg_provider}
                          </div>
                        )}
                      </div>

                      {payment.fail_reason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-800">
                            <span className="font-semibold">실패 사유:</span> {payment.fail_reason}
                          </p>
                        </div>
                      )}

                      {payment.cancel_reason && (
                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
                          <p className="text-sm text-gray-800">
                            <span className="font-semibold">취소 사유:</span> {payment.cancel_reason}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="text-right ml-6">
                      <div className="text-2xl font-bold text-gray-800">
                        {payment.amount.toLocaleString()}원
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {payment.amount.toLocaleString()}P
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 도움말 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-gray-800 mb-2">💡 결제 관련 안내</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• 결제 완료 후 포인트는 즉시 충전됩니다</li>
            <li>• 결제 실패 시 자동으로 취소 처리됩니다</li>
            <li>• 결제 관련 문의는 고객센터로 연락주세요</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
