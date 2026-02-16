import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// GET: 내 포인트 잔액 및 거래내역 조회
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const [users] = await pool.execute(
      'SELECT points FROM users WHERE id = ?',
      [session.user.id]
    );

    const [transactions] = await pool.execute(
      'SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [session.user.id, limit, offset]
    );

    const [countResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM point_transactions WHERE user_id = ?',
      [session.user.id]
    );

    return NextResponse.json({
      success: true,
      points: users[0]?.points || 0,
      transactions,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    console.error('포인트 조회 오류:', error);
    return NextResponse.json({ error: '포인트 조회에 실패했습니다.' }, { status: 500 });
  }
}
