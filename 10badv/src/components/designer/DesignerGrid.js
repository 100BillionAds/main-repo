'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './DesignerGrid.module.css';

export default function DesignerGrid({ showAll = false, limit = 6 }) {
  const [activeFilter, setActiveFilter] = useState('전체');
  const [designers, setDesigners] = useState([]);
  const [loading, setLoading] = useState(true);
  const filters = ['전체', '배너 디자인', '인스타그램 광고', '유튜브 썸네일', '카카오톡 광고', '네이버 블로그', '브랜딩', '기타'];

  useEffect(() => {
    fetchDesigners();
  }, []);

  const fetchDesigners = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/designers');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDesigners(data.designers || []);
        }
      }
    } catch (error) {
      console.error('디자이너 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDesigners = activeFilter === '전체'
    ? designers
    : designers.filter(d => d.specialty?.includes(activeFilter));

  const displayDesigners = showAll ? filteredDesigners : filteredDesigners.slice(0, limit);

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.grid}>
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className={styles.card}>
              <div className={styles.avatarWrapper}>
                <div className={`${styles.avatar} animate-pulse bg-gray-300`}></div>
              </div>
              <div className={styles.info}>
                <div className="h-6 bg-gray-300 rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
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
              {filter}
            </button>
          ))}
        </div>
      )}

      <div className={styles.grid}>
        {displayDesigners.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500">등록된 디자이너가 없습니다.</p>
          </div>
        ) : (
          displayDesigners.map((designer, index) => (
            <Link
              href={`/designers/${designer.id}`}
              key={designer.id}
              className={styles.card}
              style={{ animation: `fadeIn 0.5s ease-out ${index * 0.05}s backwards` }}
            >
              <div className={styles.avatarWrapper}>
                <div className={styles.avatar}>
                  {designer.avatar_url ? (
                    <img src={designer.avatar_url} alt={designer.name} />
                  ) : (
                    <div className="w-full h-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                      {designer.name?.charAt(0) || '?'}
                    </div>
                  )}
                </div>
                {designer.is_verified && (
                  <div className={styles.verifiedBadge}>✓</div>
                )}
              </div>
              <div className={styles.info}>
                <h3 className={styles.name}>{designer.name}</h3>
                <div className={styles.nickname}>@{designer.username}</div>
                <div className={styles.specialty}>
                  <span className={styles.specialtyIcon}>✨</span>
                  <span>{designer.specialty || '전문분야 미설정'}</span>
                </div>
                <div className={styles.stats}>
                  <div className={styles.statItem}>
                    <div className={`${styles.statValue} ${styles.rating}`}>
                      ⭐ {designer.rating ? designer.rating.toFixed(1) : '0.0'}
                    </div>
                    <div className={styles.statLabel}>평점</div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statValue}>{designer.completed_works || 0}</div>
                    <div className={styles.statLabel}>완료</div>
                  </div>
                  <div className={styles.statItem}>
                    <div className={styles.statValue}>{designer.completion_rate || 0}%</div>
                    <div className={styles.statLabel}>거래 완료율</div>
                  </div>
                </div>
                {designer.tags && designer.tags.length > 0 && (
                  <div className={styles.tags}>
                    {designer.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
