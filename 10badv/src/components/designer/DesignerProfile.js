'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './DesignerProfile.module.css';

export default function DesignerProfile({ designerId }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('portfolio');
  const [designer, setDesigner] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // designerId가 유효한 경우에만 데이터 조회
    if (designerId && designerId !== 'undefined' && designerId !== 'null') {
      fetchDesignerData();
    } else {
      console.warn('⚠️ 유효하지 않은 designerId:', designerId);
      setLoading(false);
    }
  }, [designerId]);

  const fetchDesignerData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/designers/${designerId}`);
      const data = await res.json();
      
      if (data.success) {
        setDesigner(data.designer);
        setPortfolios(data.portfolios || []);
        setReviews(data.reviews || []);
      } else {
        // 에러를 조용히 처리 (이미 로그인 페이지 등에서 처리됨)
      }
    } catch (error) {
      // 에러를 조용히 처리
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    if (!designerId || designerId === 'undefined') {
      alert('디자이너 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      const response = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designerId: parseInt(designerId),
          portfolioId: null
        })
      });

      const data = await response.json();
      
      if (data.success) {
        router.push(`/chat?room=${data.roomId}`);
      } else {
        alert(data.error || '채팅방 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('채팅방 생성 오류:', error);
      alert('로그인이 필요합니다.');
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <main className={styles.container}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </main>
    );
  }

  if (!designer) {
    return (
      <main className={styles.container}>
        <div className="text-center py-12">
          <p className="text-gray-600">디자이너 정보를 찾을 수 없습니다.</p>
          <Link href="/designers" className="mt-4 inline-block text-blue-600 hover:underline">
            디자이너 목록으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.wrapper}>
        {/* 프로필 헤더 */}
        <div className={styles.header}>
          <div className={styles.profileCard}>
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrapper}>
                <div className={styles.avatar}>
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                    {designer.name?.[0] || 'D'}
                  </div>
                </div>
                {designer.is_verified && (
                  <div className={styles.verifiedBadge}>✓</div>
                )}
              </div>
            </div>
            <div className={styles.infoSection}>
              <h1 className={styles.name}>{designer.name}</h1>
              <div className={styles.nickname}>@{designer.username || designer.name}</div>
              {designer.specialty && (
                <div className={styles.specialty}>
                  <span>✨</span>
                  <span>{designer.specialty.split(',').join(', ')}</span>
                </div>
              )}
              <div className={styles.stats}>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>⭐ {designer.rating || 0}</div>
                  <div className={styles.statLabel}>평점</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>{designer.completed_works || 0}</div>
                  <div className={styles.statLabel}>완료작업</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>{designer.review_count || 0}</div>
                  <div className={styles.statLabel}>리뷰</div>
                </div>
              </div>
              <div className={styles.actions}>
                <button onClick={handleStartChat} className={styles.chatButton}>💬 채팅하기</button>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'portfolio' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('portfolio')}
          >
            포트폴리오 ({portfolios.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'reviews' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            리뷰 ({reviews.length})
          </button>
        </div>

        {/* 포트폴리오 탭 */}
        {activeTab === 'portfolio' && (
          <div className={styles.portfolioGrid}>
            {portfolios.length === 0 ? (
              <div className="text-center py-12 text-gray-500 col-span-full">
                아직 등록된 포트폴리오가 없습니다.
              </div>
            ) : (
              portfolios.map((portfolio, index) => (
                <Link
                  href={`/portfolios/${portfolio.id}`}
                  key={portfolio.id}
                  className={styles.portfolioCard}
                  style={{ animation: `fadeIn 0.5s ease-out ${index * 0.05}s backwards` }}
                >
                  <div 
                    className={styles.portfolioImage} 
                    style={{ 
                      backgroundImage: portfolio.image_url ? `url(${portfolio.image_url})` : 'none',
                      backgroundColor: portfolio.image_url ? 'transparent' : '#e5e7eb'
                    }}
                  >
                    {!portfolio.image_url && (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        🎨
                      </div>
                    )}
                    <div className={styles.portfolioBadge}>{portfolio.category || '기타'}</div>
                  </div>
                  <div className={styles.portfolioInfo}>
                    <h3 className={styles.portfolioTitle}>{portfolio.title}</h3>
                    <div className={styles.portfolioPrice}>
                      {portfolio.price ? `${portfolio.price.toLocaleString()}원` : '가격 문의'}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* 리뷰 탭 */}
        {activeTab === 'reviews' && (
          <div className={styles.reviews}>
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                아직 작성된 리뷰가 없습니다.
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className={styles.review}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewUser}>
                      <strong>{review.buyer_name || '익명'}</strong>
                      <span className={styles.reviewDate}>
                        {review.created_at ? new Date(review.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div className={styles.reviewRating}>
                      {'⭐'.repeat(review.rating || 0)}
                    </div>
                  </div>
                  {review.portfolio_title && (
                    <div className={styles.reviewProject}>작품: {review.portfolio_title}</div>
                  )}
                  <p className={styles.reviewComment}>{review.comment}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
