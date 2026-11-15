import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool, { withTransaction } from '@/lib/db';
import { creditPoints } from '@/domain/points/ledger';
import { errorResponse } from '@/lib/apiResponse';

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;
const PORTONE_MOCK_MODE = process.env.PORTONE_MOCK_MODE === 'true' && process.env.NODE_ENV !== 'production';

// 포트원 V2 API로 결제 정보 검증 (V2는 API Secret으로 직접 인증)
async function verifyPaymentFromPortOne(paymentId) {
  const response = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        'Authorization': `PortOne ${PORTONE_API_SECRET}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || '결제 검증 실패');
  }

  return response.json();
}

async function ensurePurchaseChatRoom(connection, { buyerId, portfolioId, paymentId }) {
  const [portfolios] = await connection.execute(
    'SELECT designer_id FROM portfolios WHERE id = ?',
    [portfolioId]
  );
  if (portfolios.length === 0) return;

  const designerId = Number(portfolios[0].designer_id);
  const user1_id = Math.min(buyerId, designerId);
  const user2_id = Math.max(buyerId, designerId);

  const [existingRooms] = await connection.execute(
    'SELECT id FROM chat_rooms WHERE user1_id = ? AND user2_id = ?',
    [user1_id, user2_id]
  );

  let roomId;
  if (existingRooms.length > 0) {
    roomId = existingRooms[0].id;
    await connection.execute(
      'UPDATE chat_rooms SET payment_id = ?, last_message = ?, last_message_at = NOW() WHERE id = ?',
      [paymentId, '결제가 완료되었습니다. 채팅을 시작하세요!', roomId]
    );
  } else {
    const [roomResult] = await connection.execute(
      `INSERT INTO chat_rooms (user1_id, user2_id, portfolio_id, payment_id, last_message, last_message_at)
       VALUES (?, ?, ?, ?, '결제가 완료되었습니다. 채팅을 시작하세요!', NOW())`,
      [user1_id, user2_id, portfolioId, paymentId]
    );
    roomId = roomResult.insertId;
  }

  await connection.execute(
    `INSERT INTO chat_messages (room_id, sender_id, message, is_read, created_at)
     VALUES (?, ?, '결제가 완료되었습니다! 요청사항이나 디자인 관련 내용을 공유해주세요.', 0, NOW())`,
    [roomId, buyerId]
  );
}

// POST: 결제 완료 후 검증 → 포인트 충전
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const { paymentId, merchant_uid } = await request.json();

    if (typeof paymentId !== 'string' || !paymentId || typeof merchant_uid !== 'string' || !merchant_uid) {
      return NextResponse.json({ success: false, error: '필수 결제 정보가 누락되었습니다.' }, { status: 400 });
    }

    // 1) 잠금 없이 먼저 조회: 외부 API 호출 동안 DB 잠금을 쥐고 있지 않기 위함
    const [payments] = await pool.execute(
      'SELECT * FROM payments WHERE merchant_uid = ? AND user_id = ?',
      [merchant_uid, userId]
    );

    if (payments.length === 0) {
      return NextResponse.json({ success: false, error: '결제 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    const payment = payments[0];

    if (payment.status === 'completed') {
      return NextResponse.json({ success: true, message: '이미 완료된 결제입니다.', payment_id: payment.id });
    }
    if (payment.status !== 'pending') {
      return NextResponse.json({ success: false, error: '처리할 수 없는 결제 상태입니다.' }, { status: 400 });
    }

    // 2) 포트원 V2 API 또는 개발용 mock 검증
    let paymentData;
    if (PORTONE_MOCK_MODE && paymentId.startsWith('mock_')) {
      paymentData = {
        amount: { total: payment.amount },
        status: 'PAID',
        pgProvider: 'mock',
        pgTxId: paymentId,
        method: { card: { name: 'MockCard' } },
      };
    } else {
      if (!PORTONE_API_SECRET) {
        return NextResponse.json(
          { success: false, error: 'PORTONE_API_SECRET이 설정되지 않았습니다.' },
          { status: 500 }
        );
      }
      paymentData = await verifyPaymentFromPortOne(paymentId);
    }

    // 포트원 V2 응답 형식: amount.total (V1은 amount였음)
    const paidAmount = Number(paymentData.amount?.total ?? paymentData.amount);
    const expectedAmount = Number(payment.amount);
    if (!Number.isFinite(paidAmount) || paidAmount !== expectedAmount) {
      return NextResponse.json({ success: false, error: '결제 금액이 일치하지 않습니다.' }, { status: 400 });
    }

    // 포트원 V2 상태: 'PAID' (V1은 'paid')
    if (paymentData.status !== 'PAID') {
      return NextResponse.json({ success: false, error: '결제가 완료되지 않았습니다.' }, { status: 400 });
    }

    // 3) 결제 행을 잠그고 상태를 다시 확인한 뒤 충전한다.
    //    같은 결제에 대한 동시 검증 요청이 와도 먼저 잠근 쪽만 포인트를 충전한다.
    const result = await withTransaction(async (connection) => {
      const [locked] = await connection.execute(
        'SELECT id, status, amount, payment_method, portfolio_id FROM payments WHERE id = ? FOR UPDATE',
        [payment.id]
      );

      if (locked.length === 0 || locked[0].status !== 'pending') {
        return { alreadyProcessed: true };
      }

      await connection.execute(
        `UPDATE payments
         SET status = 'completed', imp_uid = ?, paid_at = NOW(),
             pg_provider = ?, pg_tid = ?, card_name = ?
         WHERE id = ?`,
        [
          paymentId,
          paymentData.pgProvider || paymentData.channel?.pgProvider || null,
          paymentData.pgTxId || null,
          paymentData.method?.card?.name || null,
          payment.id
        ]
      );

      const points = await creditPoints(connection, {
        userId,
        type: 'charge',
        amount: Number(locked[0].amount),
        description: `포인트 충전 (${locked[0].payment_method || 'card'})`,
        referenceType: 'payment',
        referenceId: payment.id,
      });

      // 포트폴리오 구매 결제인 경우 채팅방 자동 생성
      if (locked[0].portfolio_id) {
        await ensurePurchaseChatRoom(connection, {
          buyerId: userId,
          portfolioId: locked[0].portfolio_id,
          paymentId: payment.id,
        });
      }

      return { alreadyProcessed: false, points };
    });

    if (result.alreadyProcessed) {
      return NextResponse.json({ success: true, message: '이미 완료된 결제입니다.', payment_id: payment.id });
    }

    return NextResponse.json({
      success: true,
      message: '결제가 완료되었습니다.',
      points: result.points,
      payment_id: payment.id
    });
  } catch (error) {
    return errorResponse(error, '결제 검증에 실패했습니다.', '결제 검증 실패');
  }
}
