/**
 * Next.js 서버 시작 훅.
 * 서버가 뜰 때 한 번 스키마를 확인/보강한다 (테이블 생성, 누락 컬럼·인덱스 추가).
 * 이전에는 회원가입 API 가 처음 로드될 때만 초기화되어, 새 컬럼이 필요한 기능이 먼저 호출되면 실패했다.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV === 'test') return;
  if (!process.env.DATABASE_URL && !process.env.DATABASE_HOST) return;

  const { initializeDatabase } = await import('@/lib/db');
  const ok = await initializeDatabase();
  if (!ok) {
    console.error('⚠️ 데이터베이스 초기화에 실패했습니다. DB 연결 정보를 확인하세요.');
  }
}
