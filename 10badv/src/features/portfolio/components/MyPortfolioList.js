'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import styles from './MyPortfolioList.module.css';

export default function MyPortfolioList() {
  const { data: session } = useSession();
  const router = useRouter();
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchMyPortfolios();
    }
  }, [session]);

  const fetchMyPortfolios = async () => {
    try {
      const response = await fetch(`/api/portfolios?designerId=${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setPortfolios(data.portfolios || []);
      }
    } catch (error) {
      console.error('포트폴리오 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
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
          <Link href="/dashboard" className={styles.backLink}>
            ← 대시보드로
          </Link>
          <h1 className={styles.title}>🎨 내 포트폴리오</h1>
          <p className={styles.subtitle}>총 {portfolios.length}개의 작품</p>
        </div>
        <Link href="/my-portfolios/create" className={styles.createButton}>
          + 새 포트폴리오 등록
        </Link>
      </div>

      {portfolios.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📦</div>
          <h2 className={styles.emptyTitle}>등록된 포트폴리오가 없습니다</h2>
          <p className={styles.emptyText}>첫 번째 작품을 등록해보세요!</p>
          <Link href="/my-portfolios/create" className={styles.emptyButton}>
            포트폴리오 등록하기
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {portfolios.map((portfolio) => (
            <div key={portfolio.id} className={styles.card}>
              <div className={styles.cardImage}>
                {portfolio.thumbnail_url ? (
                  <Image src={portfolio.thumbnail_url} alt={portfolio.title} fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className={styles.cardImagePlaceholder}>🎨</div>
                )}
                <div className={styles.cardStatus}>
                  <span className={`${styles.statusBadge} ${
                    portfolio.status === 'approved' ? styles.statusApproved :
                    portfolio.status === 'rejected' ? styles.statusRejected :
                    styles.statusPending
                  }`}>
                    {portfolio.status === 'approved' ? '✅ 승인됨' :
                     portfolio.status === 'rejected' ? '❌ 거부됨' :
                     '⏳ 대기중'}
                  </span>
                </div>
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{portfolio.title}</h3>
                <p className={styles.cardDescription}>
                  {portfolio.description || '설명 없음'}
                </p>
                <div className={styles.cardMeta}>
                  <span className={styles.cardPrice}>
                    💰 {portfolio.price?.toLocaleString() || 0}원
                  </span>
                  <span className={styles.cardViews}>
                    👁️ {portfolio.views || 0}
                  </span>
                  <span className={styles.cardLikes}>
                    ❤️ {portfolio.likes || 0}
                  </span>
                </div>
                <div className={styles.cardActions}>
                  <Link href={`/my-portfolios/${portfolio.id}`} className={styles.cardButton}>
                    편집
                  </Link>
                  <button 
                    className={`${styles.cardButton} ${styles.cardButtonDanger}`}
                    onClick={() => handleDelete(portfolio.id)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  async function handleDelete(portfolioId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/portfolios/${portfolioId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('포트폴리오가 삭제되었습니다');
        fetchMyPortfolios();
      }
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다');
    }
  }
}
