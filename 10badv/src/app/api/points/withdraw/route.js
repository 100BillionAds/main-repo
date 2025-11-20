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

const WITHDRAWAL_FEE = 10000; // 인출 수수료 1만원

// POST: 포인트 인출
export async function POST(request) {
  const connection = await mysql.createConnection(dbConfig);
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { amount, bank_name, account_number, account_holder } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '인출 금액을 확인해주세요.' }, { status: 400 });
    }

    if (!bank_name || !account_number || !account_holder) {
      return NextResponse.json({ error: '계좌 정보를 모두 입력해주세요.' }, { status: 400 });
    }

    const totalAmount = amount + WITHDRAWAL_FEE;

    await connection.beginTransaction();

    // 현재 포인트 조회
    const [users] = await connection.execute(
      'SELECT points FROM users WHERE id = ? FOR UPDATE',
      [session.user.id]
    );

    const currentPoints = users[0]?.points || 0;

    if (currentPoints < totalAmount) {
      await connection.rollback();
      await connection.end();
      return NextResponse.json(
        { error: `포인트가 부족합니다. (필요: ${totalAmount.toLocaleString()}원, 보유: ${currentPoints.toLocaleString()}원)` },
        { status: 400 }
      );
    }

    const newBalance = currentPoints - totalAmount;

    // 포인트 차감
    await connection.execute(
      'UPDATE users SET points = ? WHERE id = ?',
      [newBalance, session.user.id]
    );

    // 포인트 거래내역 기록
    await connection.execute(
      `INSERT INTO point_transactions 
       (user_id, type, amount, fee, balance_after, description, status) 
       VALUES (?, 'withdraw', ?, ?, ?, ?, 'pending')`,
      [
        session.user.id,
        amount,
        WITHDRAWAL_FEE,
        newBalance,
        `포인트 인출 (${bank_name} ${account_number} ${account_holder})`,
      ]
    );

    await connection.commit();
    await connection.end();

    return NextResponse.json({
      success: true,
      message: `포인트 인출 신청이 완료되었습니다. 수수료 ${WITHDRAWAL_FEE.toLocaleString()}원이 차감되었습니다.`,
      points: newBalance,
      withdrawAmount: amount,
      fee: WITHDRAWAL_FEE,
    });
  } catch (error) {
    await connection.rollback();
    await connection.end();
    console.error('포인트 인출 오류:', error);
    return NextResponse.json({ error: '포인트 인출에 실패했습니다.' }, { status: 500 });
  }
}
