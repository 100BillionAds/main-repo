'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './MyPage.module.css';

export default function MyPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    points: 0,
    purchases: 0,
    sales: 0,
    portfolios: 0,
  });

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }
    fetchStats();
  }, [session]);

  const fetchStats = async () => {
    try {
      // 포인트 조회
      const pointsRes = await fetch('/api/points');
      const pointsData = await pointsRes.json();
      
      // 거래 통계 조회 (구매/판매)
      const transactionsRes = await fetch('/api/transactions/my');
      const transactions = await transactionsRes.json();
      
      // 포트폴리오 통계 조회 (디자이너인 경우)
      let portfolioCount = 0;
      if (session?.user?.role === 'designer') {
        const portfoliosRes = await fetch(`/api/portfolios?designerId=${session.user.id}`);
        const portfoliosData = await portfoliosRes.json();
        portfolioCount = portfoliosData.portfolios?.length || 0;
      }

      setStats({
        points: pointsData.points || 0,
        purchases: Array.isArray(transactions) ? transactions.filter(t => t.buyer_id === session.user.id).length : 0,
        sales: Array.isArray(transactions) ? transactions.filter(t => t.designer_id === session.user.id).length : 0,
        portfolios: portfolioCount,
      });
    } catch (error) {
      console.error('통계 조회 오류:', error);
    }
  };

  const menuItems = [
    {
      title: '포인트 관리',
      items: [
        { icon: '💳', label: '포인트 충전', href: '/points/charge' },
        { icon: '💰', label: '포인트 인출', href: '/points/withdraw' },
      ],
    },
    {
      title: '거래 관리',
      items: [
        { icon: '🛒', label: '구매 내역', href: '/my-transactions' },
        ...(session?.user?.role === 'designer' ? [
          { icon: '📦', label: '판매 내역', href: '/my-portfolios' },
        ] : []),
      ],
    },
    {
      title: '설정',
      items: [
        { icon: '✏️', label: '회원정보 수정', href: '/profile/edit' },
        { icon: '🔔', label: '알림 설정', href: '/settings/notifications' },
      ],
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>👤 마이페이지</h1>
        <p className={styles.subtitle}>내 정보와 활동을 관리하세요</p>
      </div>

      {/* 사용자 정보 카드 */}
      <div className={styles.profileCard}>
        <div className={styles.avatar}>
          {session?.user?.name?.charAt(0) || 'U'}
        </div>
        <div className={styles.profileInfo}>
          <h2 className={styles.userName}>{session?.user?.name}</h2>
          <p className={styles.userEmail}>{session?.user?.email}</p>
          <span className={styles.roleBadge}>
            {session?.user?.role === 'admin' ? '관리자' : session?.user?.role === 'designer' ? '디자이너' : '광고주'}
          </span>
        </div>
      </div>

      {/* 통계 */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statValue}>{stats.points.toLocaleString()}원</div>
          <div className={styles.statLabel}>보유 포인트</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🛒</div>
          <div className={styles.statValue}>{stats.purchases}</div>
          <div className={styles.statLabel}>구매 건수</div>
        </div>
        {session?.user?.role === 'designer' && (
          <>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📦</div>
              <div className={styles.statValue}>{stats.sales}</div>
              <div className={styles.statLabel}>판매 건수</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎨</div>
              <div className={styles.statValue}>{stats.portfolios}</div>
              <div className={styles.statLabel}>포트폴리오</div>
            </div>
          </>
        )}
      </div>

      {/* 메뉴 */}
      {menuItems.map((section, idx) => (
        <div key={idx} className={styles.menuSection}>
          <h3 className={styles.menuTitle}>{section.title}</h3>
          <div className={styles.menuList}>
            {section.items.map((item, itemIdx) => (
              <Link key={itemIdx} href={item.href} className={styles.menuItem}>
                <span className={styles.menuIcon}>{item.icon}</span>
                <span className={styles.menuLabel}>{item.label}</span>
                <span className={styles.menuArrow}>→</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
