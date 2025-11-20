'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './AdminDashboard.module.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPortfolios: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
    activeUsers: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 실제로는 API에서 가져와야 하지만, 데모 데이터 사용
    const fetchStats = async () => {
      // 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setStats({
        totalUsers: 1247,
        totalPortfolios: 532,
        totalTransactions: 1891,
        totalRevenue: 45890000,
        pendingApprovals: 23,
        activeUsers: 342,
      });

      setRecentActivity([
        { id: 1, type: 'user', action: '새 회원 가입', user: '김민수', time: '2분 전' },
        { id: 2, type: 'portfolio', action: '포트폴리오 등록', user: '이지은', time: '5분 전' },
        { id: 3, type: 'transaction', action: '거래 완료', user: '박철수 → 정유진', time: '12분 전' },
        { id: 4, type: 'review', action: '리뷰 작성', user: '최영희', time: '18분 전' },
        { id: 5, type: 'portfolio', action: '포트폴리오 승인 대기', user: '강호동', time: '25분 전' },
        { id: 6, type: 'user', action: '회원 탈퇴', user: '손예진', time: '1시간 전' },
      ]);

      setLoading(false);
    };

    fetchStats();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user': return '👤';
      case 'portfolio': return '🎨';
      case 'transaction': return '💰';
      case 'review': return '⭐';
      default: return '📌';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>대시보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🛠️ 관리자 대시보드</h1>
          <p className={styles.subtitle}>플랫폼 전체 현황을 한눈에 확인하세요</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refreshButton}>
            🔄 새로고침
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statPrimary}`}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>총 회원 수</div>
            <div className={styles.statValue}>{stats.totalUsers.toLocaleString()}</div>
            <div className={styles.statChange}>
              <span className={styles.changeUp}>↑ 12%</span>
              <span className={styles.changeText}>지난달 대비</span>
            </div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statSuccess}`}>
          <div className={styles.statIcon}>🎨</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>등록 포트폴리오</div>
            <div className={styles.statValue}>{stats.totalPortfolios.toLocaleString()}</div>
            <div className={styles.statChange}>
              <span className={styles.changeUp}>↑ 8%</span>
              <span className={styles.changeText}>지난달 대비</span>
            </div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statInfo}`}>
          <div className={styles.statIcon}>💼</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>총 거래 건수</div>
            <div className={styles.statValue}>{stats.totalTransactions.toLocaleString()}</div>
            <div className={styles.statChange}>
              <span className={styles.changeUp}>↑ 23%</span>
              <span className={styles.changeText}>지난달 대비</span>
            </div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statWarning}`}>
          <div className={styles.statIcon}>💰</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>총 거래액</div>
            <div className={styles.statValue}>{formatCurrency(stats.totalRevenue)}</div>
            <div className={styles.statChange}>
              <span className={styles.changeUp}>↑ 34%</span>
              <span className={styles.changeText}>지난달 대비</span>
            </div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statDanger}`}>
          <div className={styles.statIcon}>⏳</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>승인 대기</div>
            <div className={styles.statValue}>{stats.pendingApprovals.toLocaleString()}</div>
            <div className={styles.statChange}>
              <Link href="/admin/portfolios?status=pending" className={styles.actionLink}>
                지금 처리하기 →
              </Link>
            </div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statActive}`}>
          <div className={styles.statIcon}>🟢</div>
          <div className={styles.statContent}>
            <div className={styles.statLabel}>현재 접속자</div>
            <div className={styles.statValue}>{stats.activeUsers.toLocaleString()}</div>
            <div className={styles.statChange}>
              <span className={styles.changeNeutral}>실시간</span>
            </div>
          </div>
        </div>
      </div>

      {/* 퀵 액션 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>⚡ 빠른 작업</h2>
        <div className={styles.quickActions}>
          <Link href="/admin/users" className={styles.actionCard}>
            <div className={styles.actionIcon}>👥</div>
            <div className={styles.actionContent}>
              <div className={styles.actionTitle}>회원 관리</div>
              <div className={styles.actionDescription}>회원 목록, 권한 설정</div>
            </div>
          </Link>

          <Link href="/admin/portfolios" className={styles.actionCard}>
            <div className={styles.actionIcon}>🎨</div>
            <div className={styles.actionContent}>
              <div className={styles.actionTitle}>콘텐츠 관리</div>
              <div className={styles.actionDescription}>포트폴리오 승인/거부</div>
            </div>
          </Link>

          <Link href="/admin/transactions" className={styles.actionCard}>
            <div className={styles.actionIcon}>💼</div>
            <div className={styles.actionContent}>
              <div className={styles.actionTitle}>거래 관리</div>
              <div className={styles.actionDescription}>거래 내역 조회</div>
            </div>
          </Link>

          <Link href="/admin/analytics" className={styles.actionCard}>
            <div className={styles.actionIcon}>📊</div>
            <div className={styles.actionContent}>
              <div className={styles.actionTitle}>분석 리포트</div>
              <div className={styles.actionDescription}>상세 통계 보기</div>
            </div>
          </Link>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>📋 최근 활동</h2>
        <div className={styles.activityList}>
          {recentActivity.map((activity) => (
            <div key={activity.id} className={styles.activityItem}>
              <div className={styles.activityIcon}>
                {getActivityIcon(activity.type)}
              </div>
              <div className={styles.activityContent}>
                <div className={styles.activityAction}>{activity.action}</div>
                <div className={styles.activityUser}>{activity.user}</div>
              </div>
              <div className={styles.activityTime}>{activity.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
