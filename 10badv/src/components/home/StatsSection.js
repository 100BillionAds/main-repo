'use client';

import { useState, useEffect } from 'react';
import styles from './stats.module.css';

export default function StatsSection() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const stats = [
    {
      id: 1,
      icon: '📊',
      value: '1,847',
      label: '등록된 포트폴리오',
      colorClass: styles.blue
    },
    {
      id: 2,
      icon: '⚡',
      value: '234',
      label: '거래 중인 프로젝트',
      colorClass: styles.green
    },
    {
      id: 3,
      icon: '✅',
      value: '12,459',
      label: '완료된 거래',
      colorClass: styles.purple
    },
    {
      id: 4,
      icon: '👥',
      value: '3,892',
      label: '활성 사용자',
      colorClass: styles.pink
    }
  ];

  if (!isMounted) {
    return null;
  }

  return (
    <section className={styles.container}>
      <div className={styles.grid}>
        {stats.map((stat, index) => (
          <div
            key={stat.id}
            className={`${styles.card} ${stat.colorClass}`}
            style={{
              animation: `fadeIn 0.5s ease-out ${index * 0.1}s backwards`
            }}
          >
            <div className={styles.iconWrapper}>
              <span className={styles.icon}>{stat.icon}</span>
            </div>
            <div className={styles.value}>{stat.value}</div>
            <div className={styles.label}>{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
