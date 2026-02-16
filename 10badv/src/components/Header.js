'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import styles from './header.module.css';

export default function Header() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const isActive = (path) => pathname === path || pathname?.startsWith(path + '/');

  // 기본 네비게이션
  const navItems = [
    { href: '/', label: '홈', icon: '🏠' },
    { href: '/portfolios', label: '포트폴리오', icon: '🛒' },
    { href: '/designers', label: '디자이너', icon: '🧑‍🎨' },
    { href: '/dashboard', label: '대시보드', icon: '⚡' },
  ];

  // 관리자 전용 메뉴
  const adminNavItems = session?.user?.role === 'admin' ? [
    { href: '/transactions', label: '거래현황', icon: '📊' },
    { href: '/admin', label: '관리자', icon: '🛠️' },
    { href: '/admin/users', label: '회원관리', icon: '👥' },
    { href: '/admin/portfolios', label: '콘텐츠', icon: '🎨' },
  ] : [];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* 로고 */}
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>💯</span>
          <span className={styles.logoText}>백억광고</span>
        </Link>

        {/* 데스크탑 네비게이션 */}
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${styles.adminNavLink} ${isActive(item.href) ? styles.navLinkActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* 우측 액션 영역 */}
        <div className={styles.actions}>
          {status === 'loading' ? (
            <div className={styles.loadingSkeleton}></div>
          ) : session ? (
            <div className={styles.userInfo}>
              <div 
                className={styles.userAvatar}
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                style={{ cursor: 'pointer' }}
              >
                {session.user?.name?.charAt(0) || 'U'}
              </div>
              <div className={styles.userDetails}>
                <span 
                  className={styles.userName}
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  style={{ cursor: 'pointer' }}
                >
                  {session.user?.name}
                </span>
                {session.user?.role === 'admin' && (
                  <span className={styles.adminBadge}>Admin</span>
                )}
              </div>
              
              {/* 프로필 드롭다운 메뉴 */}
              {profileMenuOpen && (
                <>
                  <div 
                    className={styles.profileMenuOverlay} 
                    onClick={() => setProfileMenuOpen(false)}
                  ></div>
                  <div className={styles.profileDropdown}>
                    <Link 
                      href="/my-page" 
                      className={styles.dropdownItem}
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <span>👤</span> 마이페이지
                    </Link>
                    <Link 
                      href="/profile/edit" 
                      className={styles.dropdownItem}
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <span>✏️</span> 회원정보수정
                    </Link>
                    <Link 
                      href="/points/charge" 
                      className={styles.dropdownItem}
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <span>💳</span> 포인트충전
                    </Link>
                    <Link 
                      href="/bug-report" 
                      className={styles.dropdownItem}
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      <span>🐛</span> 오류신고
                    </Link>
                    <div className={styles.dropdownDivider}></div>
                    <button
                      onClick={() => {
                        setProfileMenuOpen(false);
                        signOut({ callbackUrl: '/' });
                      }}
                      className={styles.dropdownItem}
                    >
                      <span>🚪</span> 로그아웃
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link href="/login" className={styles.loginButton}>
              로그인
            </Link>
          )}

          {/* 모바일 메뉴 버튼 */}
          <button
            className={styles.mobileMenuButton}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="메뉴"
          >
            <span className={mobileMenuOpen ? styles.menuIconClose : styles.menuIcon}></span>
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {mobileMenuOpen && (
        <>
          <div className={styles.overlay} onClick={() => setMobileMenuOpen(false)}></div>
          <div className={styles.mobileMenu}>
            <nav className={styles.mobileNav}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.mobileNavLink} ${isActive(item.href) ? styles.mobileNavLinkActive : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
              {adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.mobileNavLink} ${styles.adminNavLink} ${isActive(item.href) ? styles.mobileNavLinkActive : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
