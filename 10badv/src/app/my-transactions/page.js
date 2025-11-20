'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './MyTransactionsPage.module.css';

export default function MyTransactionsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, completed, cancelled

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    fetchTransactions();
  }, [session, filter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transactions/my?status=${filter}`);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setTransactions(data);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('거래 내역 조회 오류:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '결제대기', color: '#f59e0b' },
      in_progress: { text: '진행중', color: '#3b82f6' },
      completed: { text: '완료', color: '#10b981' },
      cancelled: { text: '취소', color: '#ef4444' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={styles.statusBadge} style={{ background: badge.color }}>
        {badge.text}
      </span>
    );
  };

  const handleViewDetail = (transactionId) => {
    router.push(`/my-transactions/${transactionId}`);
  };

  const handleCancelTransaction = async (transactionId) => {
    if (!confirm('정말 이 거래를 취소하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (response.ok) {
        alert('거래가 취소되었습니다.');
        fetchTransactions();
      } else {
        alert('거래 취소에 실패했습니다.');
      }
    } catch (error) {
      console.error('거래 취소 오류:', error);
      alert('거래 취소 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>💰 내 거래 내역</h1>
            <p className={styles.subtitle}>
              구매한 포트폴리오와 진행 중인 거래를 확인하세요
            </p>
          </div>
        </div>

        <div className={styles.filterContainer}>
          <button
            onClick={() => setFilter('all')}
            className={filter === 'all' ? styles.filterButtonActive : styles.filterButton}
          >
            전체
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={filter === 'pending' ? styles.filterButtonActive : styles.filterButton}
          >
            결제대기
          </button>
          <button
            onClick={() => setFilter('in_progress')}
            className={filter === 'in_progress' ? styles.filterButtonActive : styles.filterButton}
          >
            진행중
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={filter === 'completed' ? styles.filterButtonActive : styles.filterButton}
          >
            완료
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={filter === 'cancelled' ? styles.filterButtonActive : styles.filterButton}
          >
            취소
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>로딩중...</div>
        ) : transactions.length === 0 ? (
          <div className={styles.empty}>
            <p>📭 거래 내역이 없습니다.</p>
            <button onClick={() => router.push('/portfolios')} className={styles.browseButton}>
              포트폴리오 둘러보기
            </button>
          </div>
        ) : (
          <div className={styles.transactionList}>
            {transactions.map((transaction) => (
              <div key={transaction.id} className={styles.transactionCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitle}>
                    <span className={styles.transactionId}>#{transaction.id}</span>
                    {getStatusBadge(transaction.status)}
                  </div>
                  <div className={styles.cardDate}>
                    {new Date(transaction.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.portfolioInfo}>
                    <h3 className={styles.portfolioTitle}>
                      {transaction.portfolio_title || '포트폴리오'}
                    </h3>
                    <p className={styles.portfolioDescription}>
                      {transaction.portfolio_description || ''}
                    </p>
                    <p className={styles.designerInfo}>
                      👤 디자이너: {transaction.designer_name || '디자이너'} (@{transaction.designer_username})
                    </p>
                  </div>

                  <div className={styles.amountInfo}>
                    <span className={styles.amountLabel}>결제금액</span>
                    <span className={styles.amount}>
                      {Number(transaction.amount).toLocaleString()}원
                    </span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <button
                    onClick={() => handleViewDetail(transaction.id)}
                    className={styles.detailButton}
                  >
                    상세보기
                  </button>
                  {transaction.status === 'pending' && (
                    <button
                      onClick={() => handleCancelTransaction(transaction.id)}
                      className={styles.cancelButton}
                    >
                      취소하기
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
