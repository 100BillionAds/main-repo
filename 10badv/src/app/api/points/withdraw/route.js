import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

const WITHDRAWAL_FEE = 10000;
const MIN_WITHDRAWAL = 50000;

// POST: 포인트 인출
export async function POST(request) {
  const connection = await pool.getConnection();
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      connection.release();
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { amount, bank_name, account_number, account_holder } = await request.json();

    if (!amount || amount <= 0) {
      connection.release();
      return NextResponse.json({ error: '인출 금액을 확인해주세요.' }, { status: 400 });
    }

    if (amount < MIN_WITHDRAWAL) {
      connection.release();
      return NextResponse.json({ error: `최소 인출 금액은 ${MIN_WITHDRAWAL.toLocaleString()}원입니다.` }, { status: 400 });
    }

    if (!bank_name || !account_number || !account_holder) {
      connection.release();
      return NextResponse.json({ error: '계좌 정보를 모두 입력해주세요.' }, { status: 400 });
    }

    const totalAmount = amount + WITHDRAWAL_FEE;
    await connection.beginTransaction();

    const [users] = await connection.execute(
      'SELECT points FROM users WHERE id = ? FOR UPDATE',
      [session.user.id]
    );

    const currentPoints = users[0]?.points || 0;

    if (currentPoints < totalAmount) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { error: `포인트가 부족합니다. (필요: ${totalAmount.toLocaleString()}원, 보유: ${currentPoints.toLocaleString()}원)` },
        { status: 400 }
      );
    }

    const newBalance = currentPoints - totalAmount;

    await connection.execute(
      'UPDATE users SET points = ? WHERE id = ?',
      [newBalance, session.user.id]
    );

    await connection.execute(
      `INSERT INTO point_transactions
       (user_id, type, amount, fee, balance_after, description, status)
       VALUES (?, 'withdraw', ?, ?, ?, ?, 'pending')`,
      [session.user.id, amount, WITHDRAWAL_FEE, newBalance, `포인트 인출 (${bank_name} ${account_number} ${account_holder})`]
    );

    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      message: `포인트 인출 신청이 완료되었습니다. 수수료 ${WITHDRAWAL_FEE.toLocaleString()}원이 차감되었습니다.`,
      points: newBalance,
      withdrawAmount: amount,
      fee: WITHDRAWAL_FEE,
    });
  } catch (error) {
    await connection.rollback().catch(() => {});
    connection.release();
    console.error('포인트 인출 오류:', error);
    return NextResponse.json({ error: '포인트 인출에 실패했습니다.' }, { status: 500 });
  }
}
