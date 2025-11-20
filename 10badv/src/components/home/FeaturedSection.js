'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './featured.module.css';

export default function FeaturedSection({ limit = 6, showViewAll = true }) {
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolios();
  }, [limit]);

  const fetchPortfolios = async () => {
    try {
      const response = await fetch(`/api/portfolios?limit=${limit}`);
      const data = await response.json();
      // API 응답이 { success: true, portfolios: [...] } 형식인 경우 처리
      if (data.success && Array.isArray(data.portfolios)) {
        setPortfolios(data.portfolios.slice(0, limit));
      } else if (Array.isArray(data)) {
        setPortfolios(data.slice(0, limit));
      } else {
        setPortfolios([]);
      }
    } catch (error) {
      console.error('포트폴리오 조회 오류:', error);
      setPortfolios([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>포트폴리오 로딩 중...</div>
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>등록된 포트폴리오가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {portfolios.map((portfolio, index) => (
          <Link
            href={`/portfolios/${portfolio.id}`}
            key={portfolio.id}
            className={styles.card}
            style={{
              animation: `fadeIn 0.5s ease-out ${index * 0.05}s backwards`
            }}
          >
            {/* 이미지 */}
            <div className={styles.imageWrapper}>
              <img
                src={portfolio.image_url || 'https://via.placeholder.com/800x600?text=Portfolio'}
                alt={portfolio.title}
                className={styles.image}
                loading="lazy"
              />
            </div>

            {/* 콘텐츠 */}
            <div className={styles.content}>
              <h3 className={styles.cardTitle}>{portfolio.title}</h3>
              <p className={styles.description}>
                {portfolio.description?.substring(0, 100)}
                {portfolio.description?.length > 100 && '...'}
              </p>

              {/* 가격 & 통계 */}
              <div className={styles.meta}>
                <div className={styles.price}>
                  ₩{Number(portfolio.price).toLocaleString()}
                </div>
                <div className={styles.stats}>
                  <span className={styles.statItem}>
                    � {portfolio.category || '일반'}
                  </span>
                </div>
              </div>

              {/* 디자이너 정보 */}
              <div className={styles.designer}>
                <div className={styles.avatar}>
                  {portfolio.designer_name?.charAt(0) || 'D'}
                </div>
                <div className={styles.designerInfo}>
                  <div className={styles.designerName}>
                    {portfolio.designer_name || '디자이너'}
                  </div>
                  <div className={styles.designerRole}>
                    전문 디자이너
                  </div>
                </div>
              </div>

              {/* 모바일 액션 버튼 */}
              <div className={styles.mobileActions}>
                <button className={`${styles.actionButton} ${styles.primaryButton}`}>
                  자세히 보기
                </button>
                <button className={`${styles.actionButton} ${styles.secondaryButton}`}>
                  채팅하기
                </button>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 더보기 버튼 */}
      {showViewAll && limit && portfolios.length >= limit && (
        <div className={styles.viewAllWrapper}>
          <Link href="/portfolios" className={styles.viewAllButton}>
            <span>전체 포트폴리오 보기</span>
            <svg className={styles.viewAllIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
