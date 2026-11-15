import { NextResponse } from 'next/server';
import { checkReadiness } from '@/lib/health';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/ready — 일할 수 있는 상태인가 (DB, 마이그레이션, Redis, 이벤트 처리)
 *
 *   200 { status: "ok" }        모두 정상
 *   200 { status: "degraded" }  DB 는 정상, 일부가 비정상 (Redis 끊김, 이벤트 밀림 등)
 *   503 { status: "down" }      DB 에 닿지 않음
 *
 * 외부 모니터링이 주기적으로 호출하는 용도다. 배포 플랫폼의 헬스 체크에는 /api/health 를 쓴다.
 * 구성 요소의 상태와 개수만 내보내고, 주소·오류 문구 같은 내부 정보는 싣지 않는다.
 */
export async function GET() {
  const result = await checkReadiness();
  return NextResponse.json(
    { ...result, timestamp: new Date().toISOString() },
    { status: result.status === 'down' ? 503 : 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
