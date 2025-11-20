'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './designer.module.css';

export default function DesignerSection({ limit = 6, showViewAll = true }) {
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDesigners();
  }, [limit]);

  const fetchDesigners = async () => {
    try {
      const response = await fetch(`/api/designers?limit=${limit}`);
      const data = await response.json();
      if (data.success && Array.isArray(data.designers)) {
        setDesigners(data.designers.slice(0, limit));
      } else {
        setDesigners([]);
      }
    } catch (error) {
      console.error('디자이너 조회 오류:', error);
      setDesigners([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  if (designers.length === 0) {
    return <div className={styles.container}>등록된 디자이너가 없습니다.</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {designers.map((designer, index) => (
          <Link href={`/designers/${designer.id}`} key={designer.id} className={styles.card} style={{ animation: `fadeIn 0.5s ease-out ${index * 0.1}s backwards` }}>
            <div className={styles.avatarWrapper}>
              <div className={styles.avatar}>
                {designer.avatar_url ? (
                  <img src={designer.avatar_url} alt={designer.name} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                    {designer.name?.charAt(0) || 'D'}
                  </div>
                )}
              </div>
              {designer.rating === 5.0 && <div className={styles.verifiedBadge}>✓</div>}
            </div>
            <div className={styles.info}>
              <div className={styles.name}>{designer.name}</div>
              <div className={styles.nickname}>@{designer.username}</div>
              <div className={styles.specialty}><span>✨</span><span>{designer.specialty}</span></div>
              <div className={styles.stats}>
                <div className={styles.statItem}><div className={`${styles.statValue} ${styles.rating}`}>⭐ {designer.rating?.toFixed(1) || '0.0'}</div><div className={styles.statLabel}>평점</div></div>
                <div className={styles.statItem}><div className={styles.statValue}>{designer.completed_works || 0}</div><div className={styles.statLabel}>완료작업</div></div>
                <div className={styles.statItem}><div className={styles.statValue}>{designer.completion_rate || 0}%</div><div className={styles.statLabel}>거래 완료율</div></div>
              </div>
              <div className={styles.actions}>
                <button className={`${styles.actionButton} ${styles.primaryButton}`}>프로필 보기</button>
                <button className={`${styles.actionButton} ${styles.secondaryButton}`}>채팅하기</button>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {showViewAll && limit && (
        <div className={styles.viewAllWrapper}>
          <Link href="/designers" className={styles.viewAllButton}>
            <span>전체 디자이너 보기</span>
            <svg className={styles.viewAllIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
