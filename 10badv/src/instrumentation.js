/**
 * Next.js 서버 시작 훅.
 * 서버가 뜰 때 한 번 실행된다.
 *  1. 아직 적용되지 않은 스키마 마이그레이션 실행 (docs/MIGRATIONS.md)
 *  2. Redis 연결을 미리 열어 둔다 (첫 요청이 연결을 기다리다 메모리 저장소로 넘어가지 않게)
 *  3. 이벤트 처리 시작: 큐 워커와 아웃박스 릴레이 (docs/EVENTS.md)
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

  const { getRedis } = await import('@/lib/redis');
  getRedis();

  // 스키마가 준비되지 않았으면 아웃박스 테이블도 없을 수 있다.
  if (ok) {
    const { startEventProcessing } = await import('@/lib/events/eventBus');
    startEventProcessing();
  }
}
