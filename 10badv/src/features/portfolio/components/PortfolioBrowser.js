'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './PortfolioBrowser.module.css';

const CATEGORIES = [
  '전체',
  '배너 디자인',
  '인스타그램 광고',
  '유튜브 썸네일',
  '카카오톡 광고',
  '네이버 블로그',
  '브랜딩',
  '기타'
];

export default function PortfolioBrowser({ session }) {
  const router = useRouter();
  const [portfolios, setPortfolios] = useState([]);
  const [purchasedPortfolios, setPurchasedPortfolios] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  useEffect(() => {
    fetchPortfolios();
    if (session) {
      fetchPurchasedPortfolios();
    }
  }, [selectedCategory, session]);
  
  const fetchPortfolios = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status', 'approved'); // 승인된 것만
      
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

  const fetchPurchasedPortfolios = async () => {
    try {
      const response = await fetch('/api/transactions');
      const data = await response.json();
      
      if (data.success) {
        const purchased = new Set(
          data.transactions
            .filter(t => t.buyer_id === session?.user?.id && t.status !== 'cancelled')
            .map(t => t.portfolio_id)
        );
        setPurchasedPortfolios(purchased);
      }
    } catch (error) {
      console.error('거래 내역 조회 실패:', error);
    }
  };
  
  const handleContactDesigner = async (portfolio) => {
    if (!session) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }
    
    // 채팅방 생성 또는 열기
    try {
      const response = await fetch('/api/chat/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          designerId: portfolio.designer_id,
          portfolioId: portfolio.id,
          initialMessage: `"${portfolio.title}" 작품에 대해 문의드립니다.`
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        router.push(`/chat?room=${data.roomId}`);
      } else {
        alert(data.error || '채팅방 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
      alert('채팅방 생성 중 오류가 발생했습니다.');
    }
  };
  
  const handlePurchase = async (portfolio) => {
    if (!session) {
      alert('로그인이 필요합니다.');
      router.push('/login');
      return;
    }
    
    // 구매 확인
    const confirmed = confirm(`${portfolio.title}\n가격: ${portfolio.price.toLocaleString()}원\n\n구매하시겠습니까?`);
    if (!confirmed) return;
    
    try {
      // 거래 생성 (POST 방식)
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolio_id: portfolio.id,
          amount: portfolio.price,
          payment_method: 'card',
          status: 'pending'
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('구매가 완료되었습니다!');
        // 구매한 포트폴리오 목록 새로고침
        await fetchPurchasedPortfolios();
        // 내 거래 목록 페이지로 이동
        router.push('/my-transactions');
      } else {
        alert(data.error || '구매에 실패했습니다.');
      }
    } catch (error) {
      console.error('구매 실패:', error);
      alert('구매 처리 중 오류가 발생했습니다.');
    }
  };
  
  // 필터링
  const filteredPortfolios = portfolios.filter(p => {
    // 카테고리 필터
    if (selectedCategory !== '전체' && p.category !== selectedCategory) {
      return false;
    }
    
    // 검색어 필터
    if (searchKeyword && !p.title.toLowerCase().includes(searchKeyword.toLowerCase()) && 
        !p.description.toLowerCase().includes(searchKeyword.toLowerCase())) {
      return false;
    }
    
    // 가격 필터
    if (priceRange.min && p.price < parseInt(priceRange.min)) {
      return false;
    }
    if (priceRange.max && p.price > parseInt(priceRange.max)) {
      return false;
    }
    
    return true;
  });
  
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
        <h1 className={styles.title}>🎨 포트폴리오 검색</h1>
        <p className={styles.subtitle}>
          전문 디자이너의 작품을 찾아보세요
        </p>
      </div>
      
      {/* 검색 및 필터 */}
      <div className={styles.filterSection}>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="작품명 또는 키워드로 검색..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.categoryFilter}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`${styles.categoryButton} ${selectedCategory === cat ? styles.categoryButtonActive : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div className={styles.priceFilter}>
          <input
            type="number"
            placeholder="최소 금액"
            value={priceRange.min}
            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
            className={styles.priceInput}
          />
          <span>~</span>
          <input
            type="number"
            placeholder="최대 금액"
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
            className={styles.priceInput}
          />
        </div>
      </div>
      
      {/* 결과 */}
      <div className={styles.results}>
        <p className={styles.resultCount}>
          {filteredPortfolios.length}개의 작품을 찾았습니다
        </p>
      </div>
      
      {/* 포트폴리오 그리드 */}
      {filteredPortfolios.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🔍</div>
          <h2 className={styles.emptyTitle}>검색 결과가 없습니다</h2>
          <p className={styles.emptyText}>
            다른 검색어나 필터를 시도해보세요
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredPortfolios.map((portfolio) => {
            const isPurchased = purchasedPortfolios.has(portfolio.id);
            return (
              <Link
                key={portfolio.id}
                href={`/designers/${portfolio.user_id}`}
                className={`${styles.card} ${isPurchased ? styles.cardPurchased : ''}`}
              >
                {isPurchased && (
                  <div className={styles.purchasedBadge}>
                    ✅ 결제 완료
                  </div>
                )}
                <div className={styles.cardImage}>
                  {portfolio.thumbnail_url ? (
                    <img src={portfolio.thumbnail_url} alt={portfolio.title} />
                  ) : (
                    <div className={styles.cardImagePlaceholder}>🎨</div>
                  )}
                </div>
                
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{portfolio.title}</h3>
                  <p className={styles.cardDescription}>{portfolio.description}</p>
                  
                  <div className={styles.cardMeta}>
                    <span className={styles.cardCategory}>🏷️ {portfolio.category}</span>
                    <span className={styles.cardPrice}>💰 {portfolio.price.toLocaleString()}원</span>
                  </div>
                  
                  <div className={styles.cardStats}>
                    <span>👁️ {portfolio.views}</span>
                    <span>❤️ {portfolio.likes}</span>
                  </div>
                  
                  <div className={styles.cardActions}>
                    <button
                      onClick={() => handleContactDesigner(portfolio)}
                      className={styles.contactButton}
                    >
                      💬 문의하기
                    </button>
                    {isPurchased ? (
                      <button
                        onClick={() => router.push('/transactions')}
                        className={styles.viewTransactionButton}
                      >
                        📋 거래 보기
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePurchase(portfolio)}
                        className={styles.purchaseButton}
                      >
                        🛒 구매하기
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
