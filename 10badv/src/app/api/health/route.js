import { NextResponse } from 'next/server';

/**
 * GET /api/health — 살아 있는가 (liveness)
 *
 * 프로세스가 응답하는지만 알린다. DB·Redis 는 확인하지 않는다.
 * 배포 플랫폼(Render, Docker)의 헬스 체크가 이 주소를 쓴다. 여기서 Redis 까지 확인하면
 * Redis 가 잠깐 끊겼을 때 플랫폼이 멀쩡한 서버를 재시작해 작은 장애를 키운다.
 * 구성 요소별 상태는 /api/health/ready 에서 본다.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}
