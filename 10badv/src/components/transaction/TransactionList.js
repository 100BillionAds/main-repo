'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './TransactionList.module.css';

export default function TransactionList({ showAll = false, limit = 6 }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('전체');
  const filters = ['전체', 'pending', 'in_progress', 'awaiting_confirmation', 'completed', 'cancelled'];
  const filterLabels = {
    '전체': '전체',
    'pending': '결제대기',
    'in_progress': '진행중',
    'awaiting_confirmation': '완료대기',
    'completed': '완료',
    'cancelled': '취소'
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTransactions(data.transactions || []);
        } else {
          console.error('거래 목록 조회 실패:', data.error);
          setTransactions([]);
        }
      }
    } catch (error) {
      console.error('거래 목록 조회 실패:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = activeFilter === '전체'
    ? transactions
    : transactions.filter(t => t.status === activeFilter);

  const displayTransactions = showAll ? filteredTransactions : filteredTransactions.slice(0, limit);

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_progress': return 'blue';
      case 'completed': return 'green';
      case 'awaiting_confirmation': return 'purple';
      case 'pending': return 'orange';
      case 'cancelled': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusLabel = (status) => {
    return filterLabels[status] || status;
  };

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <div className={styles.spinner}></div>
          <p>거래 목록 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
          <p>거래 내역이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {showAll && (
        <div className={styles.filters}>
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`${styles.filterButton} ${activeFilter === filter ? styles.filterButtonActive : ''}`}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>
      )}

      <div className={styles.list}>
        {displayTransactions.map((transaction, index) => (
          <Link
            href={`/my-transactions/${transaction.id}`}
            key={transaction.id}
            className={styles.card}
            style={{ animation: `fadeIn 0.5s ease-out ${index * 0.05}s backwards` }}
          >
            <div className={styles.thumbnail}>
              <div
                className={styles.thumbnailImage}
                style={{ 
                  backgroundImage: transaction.portfolio_image 
                    ? `url(${transaction.portfolio_image})` 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                }}
              ></div>
              <div className={`${styles.statusBadge} ${styles[`status${getStatusColor(transaction.status)}`]}`}>
                {getStatusLabel(transaction.status)}
              </div>
            </div>
            <div className={styles.content}>
              <h3 className={styles.title}>{transaction.portfolio_title || '포트폴리오'}</h3>
              <div className={styles.participants}>
                <div className={styles.participant}>
                  <span className={styles.participantLabel}>구매자:</span>
                  <span className={styles.participantName}>{transaction.buyer_name}</span>
                </div>
                <div className={styles.participant}>
                  <span className={styles.participantLabel}>디자이너:</span>
                  <div className={styles.designer}>
                    <div className={styles.designerAvatar}>
                      {transaction.designer_name?.charAt(0) || 'D'}
                    </div>
                    <span className={styles.designerName}>{transaction.designer_name}</span>
                  </div>
                </div>
              </div>
              <div className={styles.footer}>
                <div className={styles.date}>
                  <span className={styles.dateIcon}>📅</span>
                  <span>{new Date(transaction.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                <div className={styles.price}>{(transaction.amount || 0).toLocaleString()}원</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
