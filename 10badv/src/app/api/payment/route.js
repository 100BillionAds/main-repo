import { NextResponse } from 'next/server';

// 결제 처리 API (시뮬레이션)
const payments = [];

export async function POST(request) {
  try {
    const body = await request.json();
    const { amount, method, userId, userName, cardNumber, cardExpiry, cardCvc, holderName } = body;

    // 유효성 검사
    if (!amount || parseInt(amount) < 1000) {
      return NextResponse.json(
        { error: '최소 결제 금액은 1,000원입니다' },
        { status: 400 }
      );
    }

    if (!method || !['card', 'bank', 'virtual'].includes(method)) {
      return NextResponse.json(
        { error: '올바른 결제 수단을 선택하세요' },
        { status: 400 }
      );
    }

    // 카드 결제 시 추가 검증
    if (method === 'card') {
      if (!cardNumber || cardNumber.length < 16) {
        return NextResponse.json(
          { error: '카드번호를 확인하세요' },
          { status: 400 }
        );
      }
      if (!cardExpiry || cardExpiry.length < 4) {
        return NextResponse.json(
          { error: '유효기간을 확인하세요' },
          { status: 400 }
        );
      }
      if (!cardCvc || cardCvc.length < 3) {
        return NextResponse.json(
          { error: 'CVC 번호를 확인하세요' },
          { status: 400 }
        );
      }
      if (!holderName) {
        return NextResponse.json(
          { error: '카드 소유자명을 입력하세요' },
          { status: 400 }
        );
      }
    }

    // 결제 정보 생성
    const payment = {
      id: payments.length + 1,
      userId,
      userName,
      amount: parseInt(amount),
      method,
      status: 'completed',
      transactionId: `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      // 카드 정보는 마지막 4자리만 저장 (보안)
      cardLast4: method === 'card' ? cardNumber.slice(-4) : null,
    };

    payments.push(payment);

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        transactionId: payment.transactionId,
        amount: payment.amount,
        method: payment.method,
        status: payment.status,
        createdAt: payment.createdAt,
      },
    });

  } catch (error) {
    console.error('결제 처리 오류:', error);
    return NextResponse.json(
      { error: '결제 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

// 결제 내역 조회
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (userId) {
    const userPayments = payments.filter(p => p.userId === userId);
    return NextResponse.json({ payments: userPayments });
  }

  return NextResponse.json({ payments });
}

export { payments };
