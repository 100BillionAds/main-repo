import { NextResponse } from 'next/server';

/**
 * GET /api/health - 헬스 체크 엔드포인트
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
}
