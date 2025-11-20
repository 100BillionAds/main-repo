'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './PortfolioApproval.module.css';

export default function PortfolioApproval() {
  const [portfolios, setPortfolios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
  
  useEffect(() => {
    fetchPortfolios();
  }, [filter]);
  
  const fetchPortfolios = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }
      
      const response = await fetch(`/api/portfolios?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setPortfolios(data.portfolios);
      }
    } catch (error) {
      console.error('포트폴리오 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleApprove = async (id) => {
    if (!confirm('이 포트폴리오를 승인하시겠습니까?')) return;
    
    try {
      const response = await fetch(`/api/portfolios/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'approved' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('포트폴리오가 승인되었습니다.');
        fetchPortfolios();
      } else {
        alert(data.error || '승인에 실패했습니다.');
      }
    } catch (error) {
      alert('승인 처리 중 오류가 발생했습니다.');
      console.error(error);
    }
  };
  
  const handleReject = async (id) => {
    const reason = prompt('거부 사유를 입력하세요 (선택):');
    if (reason === null) return; // 취소
    
    try {
      const response = await fetch(`/api/portfolios/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'rejected' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('포트폴리오가 거부되었습니다.');
        fetchPortfolios();
      } else {
        alert(data.error || '거부 처리에 실패했습니다.');
      }
    } catch (error) {
      alert('거부 처리 중 오류가 발생했습니다.');
      console.error(error);
    }
  };
  
  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    
    try {
      const response = await fetch(`/api/portfolios/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('포트폴리오가 삭제되었습니다.');
        fetchPortfolios();
      } else {
        alert(data.error || '삭제에 실패했습니다.');
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
      console.error(error);
    }
  };
  
  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '⏳ 승인 대기', class: styles.statusPending },
      approved: { text: '✅ 승인됨', class: styles.statusApproved },
      rejected: { text: '❌ 거부됨', class: styles.statusRejected }
    };
    
    const badge = badges[status] || badges.pending;
    return <span className={`${styles.statusBadge} ${badge.class}`}>{badge.text}</span>;
  };
  
  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner}></div>
        <p>포트폴리오 로딩 중...</p>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Link href="/admin" className={styles.backLink}>
            ← 관리자 대시보드
          </Link>
          <h1 className={styles.title}>포트폴리오 승인 관리</h1>
          <p className={styles.subtitle}>
            디자이너가 등록한 포트폴리오를 검토하고 승인/거부하세요
          </p>
        </div>
      </div>
      
      <div className={styles.filterBar}>
        <button
          onClick={() => setFilter('pending')}
          className={`${styles.filterButton} ${filter === 'pending' ? styles.filterButtonActive : ''}`}
        >
          ⏳ 승인 대기 ({portfolios.filter(p => p.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`${styles.filterButton} ${filter === 'approved' ? styles.filterButtonActive : ''}`}
        >
          ✅ 승인됨
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`${styles.filterButton} ${filter === 'rejected' ? styles.filterButtonActive : ''}`}
        >
          ❌ 거부됨
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`${styles.filterButton} ${filter === 'all' ? styles.filterButtonActive : ''}`}
        >
          전체 보기
        </button>
      </div>
      
      {portfolios.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h2 className={styles.emptyTitle}>
            {filter === 'pending' ? '승인 대기 중인 포트폴리오가 없습니다' : '포트폴리오가 없습니다'}
          </h2>
          <p className={styles.emptyText}>
            {filter === 'pending' 
              ? '디자이너가 새 포트폴리오를 등록하면 여기에 표시됩니다.' 
              : '다른 필터를 선택해보세요.'}
          </p>
        </div>
      ) : (
        <div className={styles.portfolioList}>
          {portfolios.map((portfolio) => (
            <div key={portfolio.id} className={styles.portfolioCard}>
              <div className={styles.cardImage}>
                {portfolio.thumbnail_url ? (
                  <img src={portfolio.thumbnail_url} alt={portfolio.title} />
                ) : (
                  <div className={styles.cardImagePlaceholder}>🎨</div>
                )}
                <div className={styles.cardStatus}>
                  {getStatusBadge(portfolio.status)}
                </div>
              </div>
              
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{portfolio.title}</h3>
                <p className={styles.cardDescription}>{portfolio.description}</p>
                
                <div className={styles.cardMeta}>
                  <span className={styles.cardCategory}>🏷️ {portfolio.category}</span>
                  <span className={styles.cardPrice}>💰 {portfolio.price.toLocaleString()}원</span>
                </div>
                
                <div className={styles.cardInfo}>
                  <span>👁️ {portfolio.views}</span>
                  <span>❤️ {portfolio.likes}</span>
                  <span>👤 디자이너 ID: {portfolio.designer_id}</span>
                </div>
                
                <div className={styles.cardDates}>
                  <span>등록: {new Date(portfolio.created_at).toLocaleDateString('ko-KR')}</span>
                  {portfolio.updated_at && (
                    <span>수정: {new Date(portfolio.updated_at).toLocaleDateString('ko-KR')}</span>
                  )}
                </div>
                
                <div className={styles.cardActions}>
                  {portfolio.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(portfolio.id)}
                        className={`${styles.actionButton} ${styles.approveButton}`}
                      >
                        ✅ 승인
                      </button>
                      <button
                        onClick={() => handleReject(portfolio.id)}
                        className={`${styles.actionButton} ${styles.rejectButton}`}
                      >
                        ❌ 거부
                      </button>
                    </>
                  )}
                  {portfolio.status === 'rejected' && (
                    <button
                      onClick={() => handleApprove(portfolio.id)}
                      className={`${styles.actionButton} ${styles.approveButton}`}
                    >
                      ✅ 승인으로 변경
                    </button>
                  )}
                  {portfolio.status === 'approved' && (
                    <button
                      onClick={() => handleReject(portfolio.id)}
                      className={`${styles.actionButton} ${styles.rejectButton}`}
                    >
                      ❌ 거부로 변경
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(portfolio.id)}
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                  >
                    🗑️ 삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
