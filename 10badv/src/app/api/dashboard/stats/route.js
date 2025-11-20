import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/db';

/**
 * GET /api/dashboard/stats - 대시보드 통계 데이터
 */
export async function GET() {
  try {
    // 실제 DB에서 사용자 수 가져오기
    const users = await getAllUsers();
    
    const stats = {
      totalUsers: users.length,
      totalPortfolios: 156, // 샘플 데이터
      totalTransactions: 89, // 샘플 데이터
      completedTransactions: 67, // 샘플 데이터
      recentUsers: users.slice(0, 5).map(user => ({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      })),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    return NextResponse.json(
      { error: '통계 데이터 조회 실패' },
      { status: 500 }
    );
  }
}
