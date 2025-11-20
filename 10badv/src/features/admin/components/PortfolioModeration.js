'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './PortfolioModeration.module.css';

export default function PortfolioModeration() {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // all, pending, approved, rejected

  useEffect(() => {
    const fetchPortfolios = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const demoPortfolios = [
        { id: 1, title: '빈티지 카페 간판', designer: '김디자이너', status: 'pending', price: 250000, submitted: '2024-05-20', views: 23 },
        { id: 2, title: '모던 레스토랑 사이니지', designer: '이아트', status: 'pending', price: 350000, submitted: '2024-05-19', views: 45 },
        { id: 3, title: '한식당 전통 간판', designer: '박철수', status: 'approved', price: 180000, submitted: '2024-05-15', views: 178 },
        { id: 4, title: '프랜차이즈 LED 간판', designer: '정유진', status: 'approved', price: 420000, submitted: '2024-05-10', views: 234 },
        { id: 5, title: '부적절한 콘텐츠', designer: '스팸계정', status: 'rejected', price: 50000, submitted: '2024-05-18', views: 3 },
      ];
      
      setPortfolios(demoPortfolios);
      setLoading(false);
    };

    fetchPortfolios();
  }, []);

  const filteredPortfolios = portfolios.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const handleApprove = (id) => {
    alert(`포트폴리오 ${id} 승인`);
  };

  const handleReject = (id) => {
    alert(`포트폴리오 ${id} 거부`);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>포트폴리오 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Link href="/admin" className={styles.backLink}>← 대시보드로</Link>
          <h1 className={styles.title}>🎨 포트폴리오 관리</h1>
          <p className={styles.subtitle}>
            승인 대기: {portfolios.filter(p => p.status === 'pending').length}건
          </p>
        </div>
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterButton} ${filter === 'all' ? styles.filterActive : ''}`}
          onClick={() => setFilter('all')}
        >
          전체 ({portfolios.length})
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'pending' ? styles.filterActive : ''}`}
          onClick={() => setFilter('pending')}
        >
          승인 대기 ({portfolios.filter(p => p.status === 'pending').length})
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'approved' ? styles.filterActive : ''}`}
          onClick={() => setFilter('approved')}
        >
          승인됨 ({portfolios.filter(p => p.status === 'approved').length})
        </button>
        <button
          className={`${styles.filterButton} ${filter === 'rejected' ? styles.filterActive : ''}`}
          onClick={() => setFilter('rejected')}
        >
          거부됨 ({portfolios.filter(p => p.status === 'rejected').length})
        </button>
      </div>

      <div className={styles.grid}>
        {filteredPortfolios.map((portfolio) => (
          <div key={portfolio.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={`${styles.badge} ${styles[`badge${portfolio.status.charAt(0).toUpperCase() + portfolio.status.slice(1)}`]}`}>
                {portfolio.status === 'pending' && '⏳ 대기'}
                {portfolio.status === 'approved' && '✅ 승인'}
                {portfolio.status === 'rejected' && '❌ 거부'}
              </span>
              <span className={styles.views}>👁️ {portfolio.views}</span>
            </div>
            <h3 className={styles.cardTitle}>{portfolio.title}</h3>
            <div className={styles.cardInfo}>
              <div className={styles.designer}>👤 {portfolio.designer}</div>
              <div className={styles.price}>💰 {portfolio.price.toLocaleString()}원</div>
            </div>
            <div className={styles.cardFooter}>
              <div className={styles.date}>제출일: {portfolio.submitted}</div>
              {portfolio.status === 'pending' && (
                <div className={styles.cardActions}>
                  <button
                    onClick={() => handleApprove(portfolio.id)}
                    className={styles.approveButton}
                  >
                    ✅ 승인
                  </button>
                  <button
                    onClick={() => handleReject(portfolio.id)}
                    className={styles.rejectButton}
                  >
                    ❌ 거부
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredPortfolios.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <p>해당 상태의 포트폴리오가 없습니다</p>
        </div>
      )}
    </div>
  );
}
