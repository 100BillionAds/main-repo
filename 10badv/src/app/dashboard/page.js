'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPortfolios: 156,
    totalTransactions: 89,
    completedTransactions: 67,
    recentUsers: [],
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // 실제 통계 데이터 가져오기 (관리자만)
  useEffect(() => {
    if (session && session.user?.role === 'admin') {
      fetchStats();
    } else if (session) {
      // 일반 사용자는 자신의 거래 내역만 조회
      fetchMyTransactions();
    } else {
      setLoading(false);
    }
  }, [session]);

  const fetchMyTransactions = async () => {
    try {
      const response = await fetch('/api/transactions/my?status=all');
      if (response.ok) {
        const data = await response.json();
        setRecentTransactions(data.slice(0, 5)); // 최근 5개만
      }
    } catch (error) {
      console.error('거래 내역 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('통계 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>대시보드 로딩 중...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userRole = session.user?.role;
  const isAdmin = userRole === 'admin';
  const isDesigner = userRole === 'designer';

  // 관리자 대시보드
  if (isAdmin) {
    return (
      <div className={styles.container}>
        <div className={styles.welcomeSection}>
          <div className={styles.welcomeContent}>
            <div className={styles.userAvatar}>
              {session.user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className={styles.welcomeTitle}>
                안녕하세요, <span className={styles.userName}>{session.user?.name}</span>님! 👋
              </h1>
              <p className={styles.welcomeSubtitle}>관리자 대시보드에 오신 것을 환영합니다</p>
            </div>
          </div>
          <Link href="/admin" className={styles.adminButton}>
            🛠️ 관리자 페이지
          </Link>
        </div>

        <div className={styles.adminAlert}>
          <div className={styles.adminAlertIcon}>👑</div>
          <div>
            <div className={styles.adminAlertTitle}>관리자 권한으로 로그인됨</div>
            <div className={styles.adminAlertText}>플랫폼의 모든 기능을 관리할 수 있습니다</div>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.statPrimary}`}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>총 회원 수</div>
              <div className={styles.statValue}>{stats.totalUsers}</div>
              <div className={styles.statChange}>
                <span className={styles.changeNeutral}>실제 데이터</span>
              </div>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statSuccess}`}>
            <div className={styles.statIcon}>🎨</div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>총 포트폴리오</div>
              <div className={styles.statValue}>{stats.totalPortfolios}</div>
              <div className={styles.statChange}>
                <span className={styles.changeNeutral}>샘플 데이터</span>
              </div>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statInfo}`}>
            <div className={styles.statIcon}>💼</div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>총 거래 건수</div>
              <div className={styles.statValue}>{stats.totalTransactions}</div>
              <div className={styles.statChange}>
                <span className={styles.changeNeutral}>샘플 데이터</span>
              </div>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statWarning}`}>
            <div className={styles.statIcon}>✅</div>
            <div className={styles.statContent}>
              <div className={styles.statLabel}>완료된 거래</div>
              <div className={styles.statValue}>{stats.completedTransactions}</div>
              <div className={styles.statChange}>
                <span className={styles.changeNeutral}>샘플 데이터</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>📊 최근 가입 사용자 (실제 데이터)</h2>
          </div>
          <div className={styles.activityList}>
            {stats.recentUsers.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>👥</div>
                <p>아직 가입한 사용자가 없습니다</p>
              </div>
            ) : (
              stats.recentUsers.map((user) => (
                <div key={user.id} className={styles.activityItem}>
                  <div className={`${styles.activityIcon} ${
                    user.role === 'admin' ? styles.activityIconPurple :
                    user.role === 'designer' ? styles.activityIconBlue :
                    styles.activityIconGreen
                  }`}>
                    {user.role === 'admin' ? '👑' : user.role === 'designer' ? '🎨' : '👤'}
                  </div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityTitle}>{user.name} ({user.username})</div>
                    <div className={styles.activityDescription}>{user.email || '이메일 미등록'}</div>
                    <div className={styles.activityTime}>
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')} 가입
                    </div>
                  </div>
                  <span className={`${styles.badge} ${
                    user.role === 'admin' ? styles.badgeRating :
                    user.role === 'designer' ? styles.badgeNew :
                    styles.badgeSuccess
                  }`}>
                    {user.role === 'admin' ? '관리자' : user.role === 'designer' ? '디자이너' : '광고주'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // 디자이너/광고주 대시보드
  return (
    <div className={styles.container}>
      <div className={styles.welcomeSection}>
        <div className={styles.welcomeContent}>
          <div className={styles.userAvatar}>
            {session.user?.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h1 className={styles.welcomeTitle}>
              안녕하세요, <span className={styles.userName}>{session.user?.name}</span>님! 👋
            </h1>
            <p className={styles.welcomeSubtitle}>
              {isDesigner ? '포트폴리오를 관리하고 고객과 소통하세요' : '원하는 디자인을 찾아보세요'}
            </p>
          </div>
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className={styles.quickActions}>
        {isDesigner ? (
          <>
            <Link href="/my-portfolios" className={styles.actionCard}>
              <div className={styles.actionIcon}>🎨</div>
              <div className={styles.actionContent}>
                <div className={styles.actionTitle}>내 포트폴리오</div>
                <div className={styles.actionDescription}>작품 관리 및 등록</div>
              </div>
              <div className={styles.actionArrow}>→</div>
            </Link>
            <Link href="/chat" className={styles.actionCard}>
              <div className={styles.actionIcon}>💬</div>
              <div className={styles.actionContent}>
                <div className={styles.actionTitle}>채팅</div>
                <div className={styles.actionDescription}>고객과 소통하기</div>
              </div>
              <div className={styles.actionArrow}>→</div>
            </Link>
          </>
        ) : (
          <>
            <Link href="/portfolios" className={styles.actionCard}>
              <div className={styles.actionIcon}>🔍</div>
              <div className={styles.actionContent}>
                <div className={styles.actionTitle}>포트폴리오 검색</div>
                <div className={styles.actionDescription}>원하는 디자인 찾기</div>
              </div>
              <div className={styles.actionArrow}>→</div>
            </Link>
            <Link href="/chat" className={styles.actionCard}>
              <div className={styles.actionIcon}>💬</div>
              <div className={styles.actionContent}>
                <div className={styles.actionTitle}>채팅</div>
                <div className={styles.actionDescription}>디자이너와 소통하기</div>
              </div>
              <div className={styles.actionArrow}>→</div>
            </Link>
          </>
        )}
        <Link href="/my-transactions" className={styles.actionCard}>
          <div className={styles.actionIcon}>💰</div>
          <div className={styles.actionContent}>
            <div className={styles.actionTitle}>내 거래</div>
            <div className={styles.actionDescription}>구매/판매 내역 확인</div>
          </div>
          <div className={styles.actionArrow}>→</div>
        </Link>
      </div>

      {/* 최근 거래 내역 */}
      {recentTransactions.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>💳 최근 거래 내역</h2>
            <Link href="/my-transactions" className={styles.viewAllLink}>
              전체보기 →
            </Link>
          </div>
          <div className={styles.transactionList}>
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className={styles.transactionItem}>
                <div className={styles.transactionIcon}>
                  {transaction.status === 'completed' ? '✅' : 
                   transaction.status === 'pending' ? '⏳' : 
                   transaction.status === 'in_progress' ? '🔄' : '❌'}
                </div>
                <div className={styles.transactionInfo}>
                  <div className={styles.transactionTitle}>
                    {transaction.portfolio_title || '포트폴리오 구매'}
                  </div>
                  <div className={styles.transactionDate}>
                    {new Date(transaction.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <div className={styles.transactionAmount}>
                  {Number(transaction.amount).toLocaleString()}원
                </div>
                <div className={styles.transactionStatus}>
                  {transaction.status === 'completed' ? '완료' :
                   transaction.status === 'pending' ? '대기' :
                   transaction.status === 'in_progress' ? '진행중' : '취소'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 추천 포트폴리오 */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>✨ {isDesigner ? '인기 포트폴리오' : '추천 포트폴리오'}</h2>
          <Link href="/portfolios" className={styles.viewAllLink}>
            전체보기 →
          </Link>
        </div>
        <div className={styles.portfolioGrid}>
          {[1, 2, 3].map((item) => (
            <Link href={`/portfolios/${item}`} key={item} className={styles.portfolioCard}>
              <div className={styles.portfolioImage}>
                <div className={styles.portfolioImagePlaceholder}>🎨</div>
              </div>
              <div className={styles.portfolioInfo}>
                <h3 className={styles.portfolioTitle}>포트폴리오 제목 {item}</h3>
                <div className={styles.portfolioMeta}>
                  <span className={styles.portfolioDesigner}>👤 디자이너명</span>
                  <span className={styles.portfolioPrice}>💰 250,000원</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
