'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './PortfolioGrid.module.css';

const samplePortfolios = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  title: ['프리미엄 간판 디자인', '미니멀 사인보드', '네온사인 제작', '입체 간판', '스탠드 간판', '채널 레터'][i % 6],
  designer: ['김민준', '이서연', '박준혁', '최유진', '정수현', '강동현'][i % 6],
  designerAvatar: `https://i.pravatar.cc/150?img=${12 + (i % 6) * 5}`,
  price: [350000, 420000, 580000, 290000, 450000, 720000][i % 6],
  imageUrl: `https://images.unsplash.com/photo-${1550000000000 + i * 100000}?w=800&h=600&fit=crop`,
  category: ['네온사인', '미니멀', '프리미엄', '입체', '스탠드', '채널'][i % 6],
  rating: 4.5 + (i % 5) * 0.1,
  reviews: 10 + (i % 20),
}));

export default function PortfolioGrid({ showAll = false, limit = 6 }) {
  const [activeFilter, setActiveFilter] = useState('전체');
  const filters = ['전체', '네온사인', '미니멀', '프리미엄', '입체', '스탠드', '채널'];

  const filteredPortfolios = activeFilter === '전체' 
    ? samplePortfolios 
    : samplePortfolios.filter(p => p.category === activeFilter);

  const displayPortfolios = showAll ? filteredPortfolios : filteredPortfolios.slice(0, limit);

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
        {displayPortfolios.map((portfolio, index) => (
          <Link
            href={`/portfolios/${portfolio.id}`}
            key={portfolio.id}
            className={styles.card}
            style={{ animation: `fadeIn 0.5s ease-out ${index * 0.05}s backwards` }}
          >
            <div className={styles.imageWrapper}>
              <div className={styles.image} style={{ backgroundImage: `url(${portfolio.imageUrl})` }}></div>
              <div className={styles.categoryBadge}>{portfolio.category}</div>
            </div>
            <div className={styles.content}>
              <h3 className={styles.title}>{portfolio.title}</h3>
              <div className={styles.designer}>
                <div className={styles.designerAvatar}>
                  <img src={portfolio.designerAvatar} alt={portfolio.designer} />
                </div>
                <span className={styles.designerName}>{portfolio.designer}</span>
              </div>
              <div className={styles.stats}>
                <div className={styles.rating}>
                  <span className={styles.star}>⭐</span>
                  <span>{portfolio.rating}</span>
                  <span className={styles.reviews}>({portfolio.reviews})</span>
                </div>
                <div className={styles.price}>
                  {portfolio.price.toLocaleString()}원
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
