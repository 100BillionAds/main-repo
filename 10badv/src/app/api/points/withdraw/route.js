import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { withTransaction } from '@/lib/db';
import { debitPoints } from '@/domain/points/ledger';
import { toPositiveInteger } from '@/domain/errors';
import { errorResponse } from '@/lib/apiResponse';

const WITHDRAWAL_FEE = 10000;
const MIN_WITHDRAWAL = 50000;

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

// POST: 포인트 인출 신청
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const amount = toPositiveInteger(body.amount);
    const bankName = cleanText(body.bank_name, 50);
    const accountNumber = cleanText(body.account_number, 50);
    const accountHolder = cleanText(body.account_holder, 50);

    if (!amount) {
      return NextResponse.json({ error: '인출 금액을 확인해주세요.' }, { status: 400 });
    }

    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json({ error: `최소 인출 금액은 ${MIN_WITHDRAWAL.toLocaleString()}원입니다.` }, { status: 400 });
    }

    if (!bankName || !accountNumber || !accountHolder) {
      return NextResponse.json({ error: '계좌 정보를 모두 입력해주세요.' }, { status: 400 });
    }

    const newBalance = await withTransaction((connection) =>
      debitPoints(connection, {
        userId: Number(session.user.id),
        type: 'withdraw',
        amount,
        fee: WITHDRAWAL_FEE,
        description: `포인트 인출 (${bankName} ${accountNumber} ${accountHolder})`,
        status: 'pending',
      })
    );

    return NextResponse.json({
      success: true,
      message: `포인트 인출 신청이 완료되었습니다. 수수료 ${WITHDRAWAL_FEE.toLocaleString()}원이 차감되었습니다.`,
      points: newBalance,
      withdrawAmount: amount,
      fee: WITHDRAWAL_FEE,
    });
  } catch (error) {
    return errorResponse(error, '포인트 인출에 실패했습니다.', '포인트 인출 오류');
  }
}
