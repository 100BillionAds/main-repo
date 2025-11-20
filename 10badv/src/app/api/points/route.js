import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'merk',
  database: '10badv',
};

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

    const connection = await mysql.createConnection(dbConfig);

    // 포인트 잔액 조회
    const [users] = await connection.execute(
      'SELECT points FROM users WHERE id = ?',
      [session.user.id]
    );

    // 포인트 거래내역 조회
    const [transactions] = await connection.execute(
      `SELECT * FROM point_transactions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ${limit} OFFSET ${offset}`,
      [session.user.id]
    );

    // 전체 거래내역 수 조회
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM point_transactions WHERE user_id = ?',
      [session.user.id]
    );

    await connection.end();

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

// POST: 포인트 충전
export async function POST(request) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { amount, payment_method } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '충전 금액을 확인해주세요.' }, { status: 400 });
    }

    await connection.beginTransaction();

    // 현재 포인트 조회
    const [users] = await connection.execute(
      'SELECT points FROM users WHERE id = ? FOR UPDATE',
      [session.user.id]
    );

    const currentPoints = users[0]?.points || 0;
    const newBalance = currentPoints + amount;

    // 포인트 업데이트
    await connection.execute(
      'UPDATE users SET points = ? WHERE id = ?',
      [newBalance, session.user.id]
    );

    // 포인트 거래내역 기록
    await connection.execute(
      `INSERT INTO point_transactions 
       (user_id, type, amount, fee, balance_after, description, status) 
       VALUES (?, 'charge', ?, 0, ?, ?, 'completed')`,
      [session.user.id, amount, newBalance, `포인트 충전 (${payment_method || '카드'})`]
    );

    await connection.commit();
    await connection.end();

    return NextResponse.json({
      success: true,
      message: '포인트가 충전되었습니다.',
      points: newBalance,
    });
  } catch (error) {
    await connection.rollback();
    await connection.end();
    console.error('포인트 충전 오류:', error);
    return NextResponse.json({ error: '포인트 충전에 실패했습니다.' }, { status: 500 });
  }
}
