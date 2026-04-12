import Link from 'next/link';
import FeaturedSection from '@/components/home/FeaturedSection';
import StatsSection from '@/components/home/StatsSection';
import DesignerSection from '@/components/home/DesignerSection';
import { isRuntimeReadOnlyMode } from '@/lib/runtimeMode';
import styles from './home.module.css';

export default function Home() {
  const isReadOnlyMode = isRuntimeReadOnlyMode();

  return (
    <main className="min-h-screen">
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={`${styles.heroBlob} ${styles.heroBlob1}`} />
          <div className={`${styles.heroBlob} ${styles.heroBlob2}`} />
          <div className={`${styles.heroBlob} ${styles.heroBlob3}`} />
        </div>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span>🎉</span>
            <span>새로운 디자인 마켓플레이스</span>
          </div>
          <h1 className={styles.heroTitle}>
            당신의 디자인을<br />
            세상과 공유하세요
          </h1>
          <p className={styles.heroDescription}>
            10만 명의 디자이너들이 함께하는 한국 최대 디자인 거래 플랫폼
          </p>
          <div className={styles.heroCta}>
            <Link href="/portfolios">
              <button className={`${styles.heroCtaButton} ${styles.heroCtaPrimary}`}>
                포트폴리오 둘러보기
              </button>
            </Link>
            {!isReadOnlyMode && (
              <Link href="/auth/signup">
                <button className={`${styles.heroCtaButton} ${styles.heroCtaSecondary}`}>
                  무료로 시작하기
                </button>
              </Link>
            )}
          </div>
          {isReadOnlyMode && (
            <div className={styles.betaNotice}>
              현재는 비용 최적화를 위한 클로즈드 테스트 모드입니다. 공개 회원가입/결제 기능은 잠시 비활성화되었습니다.
            </div>
          )}
        </div>
      </section>
      <StatsSection />
      <section className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>최근 거래된 포트폴리오</h2>
        <FeaturedSection />
      </section>
      <section className={styles.designerSection}>
        <h2 className={styles.sectionTitle}>우수 디자이너</h2>
        <DesignerSection />
      </section>
    </main>
  );
}
