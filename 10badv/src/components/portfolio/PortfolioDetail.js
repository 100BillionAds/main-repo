'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './PortfolioDetail.module.css';

export default function PortfolioDetail({ portfolioId }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(0);
  const [portfolio, setPortfolio] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    fetchPortfolio();
    if (session) {
      fetchUserPoints();
    }
  }, [portfolioId, session]);

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`/api/portfolios/${portfolioId}`);
      const data = await response.json();
      if (data.success) {
        setPortfolio(data.portfolio);
      } else {
        alert('포트폴리오를 찾을 수 없습니다.');
        router.push('/portfolios');
      }
    } catch (error) {
      console.error('포트폴리오 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPoints = async () => {
    try {
      const response = await fetch('/api/points');
      const data = await response.json();
      if (data.success) {
        setUserPoints(data.points);
      }
    } catch (error) {
      console.error('포인트 조회 오류:', error);
    }
  };

  const handlePurchase = async () => {
    if (!session) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }

    if (userPoints < portfolio.price) {
      if (confirm(`포인트가 부족합니다.\n필요: ${portfolio.price.toLocaleString()}P\n보유: ${userPoints.toLocaleString()}P\n\n포인트 충전 페이지로 이동하시겠습니까?`)) {
        router.push('/points/charge');
      }
      return;
    }

    if (!confirm(`${portfolio.price.toLocaleString()}P를 사용하여 이 포트폴리오를 구매하시겠습니까?`)) {
      return;
    }

    setPurchasing(true);
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio_id: portfolioId,
          amount: portfolio.price,
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('구매가 완료되었습니다!');
        router.push('/my-transactions');
      } else {
        alert(data.error || '구매에 실패했습니다.');
      }
    } catch (error) {
      console.error('구매 오류:', error);
      alert('구매 중 오류가 발생했습니다.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>로딩 중...</div>;
  }

  if (!portfolio) {
    return <div className={styles.error}>포트폴리오를 찾을 수 없습니다.</div>;
  }

  return (
    <main className={styles.container}>
      <div className={styles.wrapper}>
        {/* 왼쪽: 이미지 갤러리 */}
        <div className={styles.gallery}>
          <div className={styles.mainImage}>
            <div 
              className={styles.image} 
              style={{ 
                backgroundImage: portfolio.thumbnail_url 
                  ? `url(${portfolio.thumbnail_url})` 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundColor: '#f3f4f6'
              }}
            ></div>
          </div>
          
          {/* 상세 설명 */}
          <div className={styles.description}>
            <h2 className={styles.sectionTitle}>작품 설명</h2>
            <p className={styles.descriptionText}>{portfolio.description || '설명이 없습니다.'}</p>
            
            {portfolio.category && (
              <div className={styles.tags}>
                <span className={styles.tag}>#{portfolio.category}</span>
              </div>
            )}
          </div>
        </div>

        {/* 오른쪽: 정보 사이드바 */}
        <aside className={styles.sidebar}>
          <div className={styles.card}>
            <div className={styles.categoryBadge}>{portfolio.category || '디자인'}</div>
            <h1 className={styles.title}>{portfolio.title}</h1>
            <div className={styles.price}>{portfolio.price?.toLocaleString()}원</div>

            {portfolio.designer_name && (
              <div className={styles.designer}>
                <div className={styles.designerInfo}>
                  <div className={styles.designerName}>👤 {portfolio.designer_name}</div>
                  <div className={styles.designerNickname}>@{portfolio.designer_username}</div>
                </div>
              </div>
            )}

            {session && (
              <div className={styles.pointsInfo}>
                <span className={styles.pointsLabel}>보유 포인트</span>
                <span className={styles.pointsValue} style={{ color: userPoints >= portfolio.price ? '#10b981' : '#ef4444' }}>
                  {userPoints.toLocaleString()}P
                </span>
              </div>
            )}

            <div className={styles.actions}>
              <button 
                className={styles.purchaseButton}
                onClick={handlePurchase}
                disabled={purchasing}
              >
                {purchasing ? '처리 중...' : `💳 ${portfolio.price?.toLocaleString()}P로 구매하기`}
              </button>
              {!session && (
                <Link href="/login" className={styles.loginLink}>
                  로그인이 필요합니다
                </Link>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>📦 거래 안내</h3>
            <ul className={styles.infoList}>
              <li>✓ 포인트 결제 시스템</li>
              <li>✓ 안전한 거래 보장</li>
              <li>✓ 실시간 작업 진행 공유</li>
              <li>✓ 포인트 인출 가능 (수수료 1만원)</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
