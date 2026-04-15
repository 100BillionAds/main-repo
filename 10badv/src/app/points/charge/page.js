'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './PointsCharge.module.css';

export default function PointsChargePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [chargeAmount, setChargeAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    fetchPointsData();
  }, [session, status]);

  const fetchPointsData = async () => {
    try {
      const response = await fetch('/api/points');
      const data = await response.json();
      if (data.success) {
        setPoints(data.points);
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('포인트 조회 오류:', error);
    }
  };

  const handleQuickAmount = (amount) => {
    setChargeAmount(amount.toString());
  };

  const handleCharge = async () => {
    const amount = parseInt(chargeAmount, 10);
    if (!amount || amount <= 0) {
      alert('충전 금액을 입력해주세요.');
      return;
    }

    if (amount < 1000) {
      alert('최소 충전 금액은 1,000원입니다.');
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        amount: String(amount),
        title: '포인트 충전',
      });

      if (paymentMethod) {
        params.set('method', paymentMethod);
      }

      router.push(`/payment?${params.toString()}`);
    } catch (error) {
      console.error('포인트 충전 오류:', error);
      alert('포인트 충전 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionTypeLabel = (type) => {
    const labels = {
      charge: '충전',
      use: '사용',
      withdraw: '인출',
      refund: '환불',
    };
    return labels[type] || type;
  };

  const getTransactionTypeColor = (type) => {
    const colors = {
      charge: '#10b981',
      use: '#ef4444',
      withdraw: '#f59e0b',
      refund: '#3b82f6',
    };
    return colors[type] || '#6b7280';
  };

  return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/my-page" className={styles.backButton}>
            ← 마이페이지
          </Link>
          <h1 className={styles.title}>💳 포인트 충전</h1>
        </div>

      <div className={styles.content}>
        {/* 포인트 잔액 */}
        <div className={styles.balanceCard}>
          <div className={styles.balanceLabel}>보유 포인트</div>
          <div className={styles.balanceAmount}>{points.toLocaleString()}원</div>
        </div>

        {/* 충전 섹션 */}
        <div className={styles.chargeSection}>
          <h2 className={styles.sectionTitle}>충전하기</h2>
          
          {/* 빠른 금액 선택 */}
          <div className={styles.quickAmounts}>
            {[1000, 3000, 5000, 10000, 30000, 50000].map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickAmount(amount)}
                className={styles.quickAmountButton}
              >
                {amount.toLocaleString()}원
              </button>
            ))}
          </div>

          {/* 충전 금액 입력 */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>충전 금액</label>
            <input
              type="number"
              value={chargeAmount}
              onChange={(e) => setChargeAmount(e.target.value)}
              placeholder="금액을 입력하세요 (최소 1천원)"
              className={styles.input}
              min="1000"
              step="1000"
            />
          </div>

          {/* 결제 방법 */}
          <div className={styles.inputGroup}>
            <label className={styles.label}>결제 방법</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={styles.select}
            >
              <option value="card">신용/체크카드</option>
              <option value="bank">계좌이체</option>
              <option value="virtual">가상계좌</option>
            </select>
          </div>

          {/* 충전 버튼 */}
          <button
            onClick={handleCharge}
            disabled={isLoading}
            className={styles.chargeButton}
          >
            {isLoading ? '처리 중...' : '충전하기'}
          </button>

          <div className={styles.notice}>
            <p>• 최소 충전 금액은 1천원입니다.</p>
            <p>• 충전된 포인트는 환불이 불가합니다.</p>
            <p>• 포인트 인출 시 1만원의 수수료가 부과됩니다.</p>
          </div>
        </div>

        {/* 포인트 인출 링크 */}
        <div className={styles.withdrawSection}>
          <Link href="/points/withdraw" className={styles.withdrawButton}>
            포인트 인출하기 →
          </Link>
        </div>

        {/* 거래 내역 */}
        <div className={styles.historySection}>
          <h2 className={styles.sectionTitle}>거래 내역</h2>
          {transactions.length === 0 ? (
            <div className={styles.empty}>거래 내역이 없습니다.</div>
          ) : (
            <div className={styles.transactionList}>
              {transactions.slice(0, 10).map((tx) => (
                <div key={tx.id} className={styles.transactionItem}>
                  <div className={styles.transactionInfo}>
                    <span
                      className={styles.transactionType}
                      style={{ color: getTransactionTypeColor(tx.type) }}
                    >
                      {getTransactionTypeLabel(tx.type)}
                    </span>
                    <span className={styles.transactionDesc}>{tx.description}</span>
                    <span className={styles.transactionDate}>
                      {new Date(tx.created_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div className={styles.transactionAmount}>
                    <span style={{ color: tx.type === 'charge' || tx.type === 'refund' ? '#10b981' : '#ef4444' }}>
                      {tx.type === 'charge' || tx.type === 'refund' ? '+' : '-'}
                      {tx.amount.toLocaleString()}원
                    </span>
                    {tx.fee > 0 && (
                      <span className={styles.transactionFee}>수수료: {tx.fee.toLocaleString()}원</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
