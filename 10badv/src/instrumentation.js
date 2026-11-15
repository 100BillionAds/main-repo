/**
 * Next.js 서버 시작 훅.
 * 서버가 뜰 때 한 번, 아직 적용되지 않은 스키마 마이그레이션을 실행한다 (docs/MIGRATIONS.md).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV === 'test') return;
  // next build 중에는 DB 에 접속하지 않는다 (CI·도커 빌드에는 DB 가 없다)
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  if (!process.env.DATABASE_URL && !process.env.DATABASE_HOST) return;

  const { initializeDatabase } = await import('@/lib/db');
  const ok = await initializeDatabase();
  if (!ok) {
    console.error('⚠️ 스키마 마이그레이션에 실패했습니다. 위 오류와 DB 연결 정보를 확인하세요.');
  }
}
