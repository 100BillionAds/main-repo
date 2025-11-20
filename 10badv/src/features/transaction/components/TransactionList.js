'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import styles from './TransactionList.module.css';

export default function TransactionList() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, in_progress, completed, cancelled
  
  useEffect(() => {
    fetchTransactions();
  }, [filter]);
  
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }
      
      const response = await fetch(`/api/transactions?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('거래 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStatusChange = async (id, newStatus) => {
    if (!confirm(`거래를 "${getStatusText(newStatus)}" 상태로 변경하시겠습니까?`)) return;
    
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('거래 상태가 변경되었습니다.');
        fetchTransactions();
      } else {
        alert(data.error || '상태 변경에 실패했습니다.');
      }
    } catch (error) {
      alert('상태 변경 중 오류가 발생했습니다.');
      console.error(error);
    }
  };
  
  const getStatusText = (status) => {
    const statusMap = {
      pending: '대기중',
      in_progress: '진행중',
      completed: '완료',
      cancelled: '취소'
    };
    return statusMap[status] || status;
  };
  
  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '⏳ 대기중', class: styles.statusPending },
      in_progress: { text: '🔄 진행중', class: styles.statusProgress },
      completed: { text: '✅ 완료', class: styles.statusCompleted },
      cancelled: { text: '❌ 취소', class: styles.statusCancelled }
    };
    
    const badge = badges[status] || badges.pending;
    return <span className={`${styles.statusBadge} ${badge.class}`}>{badge.text}</span>;
  };
  
  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner}></div>
        <p>거래 내역 로딩 중...</p>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Link href="/dashboard" className={styles.backLink}>
            ← 대시보드
          </Link>
          <h1 className={styles.title}>거래 내역</h1>
          <p className={styles.subtitle}>나의 거래 내역을 관리하세요</p>
        </div>
      </div>
      
      <div className={styles.filterBar}>
        <button
          onClick={() => setFilter('all')}
          className={`${styles.filterButton} ${filter === 'all' ? styles.filterButtonActive : ''}`}
        >
          전체 보기
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`${styles.filterButton} ${filter === 'pending' ? styles.filterButtonActive : ''}`}
        >
          ⏳ 대기중
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`${styles.filterButton} ${filter === 'in_progress' ? styles.filterButtonActive : ''}`}
        >
          🔄 진행중
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`${styles.filterButton} ${filter === 'completed' ? styles.filterButtonActive : ''}`}
        >
          ✅ 완료
        </button>
        <button
          onClick={() => setFilter('cancelled')}
          className={`${styles.filterButton} ${filter === 'cancelled' ? styles.filterButtonActive : ''}`}
        >
          ❌ 취소
        </button>
      </div>
      
      {transactions.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>💼</div>
          <h2 className={styles.emptyTitle}>거래 내역이 없습니다</h2>
          <p className={styles.emptyText}>
            포트폴리오를 구매하면 여기에 표시됩니다
          </p>
          <Link href="/portfolios" className={styles.emptyButton}>
            포트폴리오 둘러보기
          </Link>
        </div>
      ) : (
        <div className={styles.transactionList}>
          {transactions.map((transaction) => {
            const isBuyer = transaction.buyer_id === session?.user?.id;
            const role = isBuyer ? '구매자' : '디자이너';
            
            return (
              <div key={transaction.id} className={styles.transactionCard}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.cardTitle}>{transaction.portfolio_title}</h3>
                    <p className={styles.cardRole}>내 역할: {role}</p>
                  </div>
                  {getStatusBadge(transaction.status)}
                </div>
                
                <div className={styles.cardBody}>
                  <div className={styles.cardInfo}>
                    <span className={styles.infoLabel}>거래 번호:</span>
                    <span className={styles.infoValue}>#{transaction.id}</span>
                  </div>
                  <div className={styles.cardInfo}>
                    <span className={styles.infoLabel}>금액:</span>
                    <span className={styles.infoValue}>
                      💰 {transaction.amount.toLocaleString()}원
                    </span>
                  </div>
                  <div className={styles.cardInfo}>
                    <span className={styles.infoLabel}>결제 방법:</span>
                    <span className={styles.infoValue}>{transaction.payment_method}</span>
                  </div>
                  <div className={styles.cardInfo}>
                    <span className={styles.infoLabel}>
                      {isBuyer ? '디자이너:' : '구매자:'}
                    </span>
                    <span className={styles.infoValue}>
                      {isBuyer ? transaction.designer_name : transaction.buyer_name}
                    </span>
                  </div>
                  <div className={styles.cardInfo}>
                    <span className={styles.infoLabel}>거래일:</span>
                    <span className={styles.infoValue}>
                      {new Date(transaction.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>
                
                <div className={styles.cardActions}>
                  {transaction.status === 'pending' && isBuyer && (
                    <button
                      onClick={() => handleStatusChange(transaction.id, 'in_progress')}
                      className={styles.actionButton}
                    >
                      작업 시작
                    </button>
                  )}
                  {transaction.status === 'in_progress' && !isBuyer && (
                    <button
                      onClick={() => handleStatusChange(transaction.id, 'completed')}
                      className={styles.actionButton}
                    >
                      작업 완료
                    </button>
                  )}
                  {transaction.status === 'pending' && (
                    <button
                      onClick={() => handleStatusChange(transaction.id, 'cancelled')}
                      className={`${styles.actionButton} ${styles.actionButtonDanger}`}
                    >
                      거래 취소
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
