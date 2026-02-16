import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;

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

// POST: 결제 완료 후 검증
export async function POST(request) {
  const connection = await pool.getConnection();

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      connection.release();
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { paymentId, merchant_uid } = await request.json();

    // V2에서는 paymentId 사용, 하위호환을 위해 imp_uid도 지원
    const actualPaymentId = paymentId;
    if (!actualPaymentId || !merchant_uid) {
      connection.release();
      return NextResponse.json({ success: false, error: '필수 결제 정보가 누락되었습니다.' }, { status: 400 });
    }

    // 포트원 V2 API로 결제 정보 검증
    const paymentData = await verifyPaymentFromPortOne(actualPaymentId);

    // DB에서 결제 정보 조회
    const [payments] = await connection.execute(
      'SELECT * FROM payments WHERE merchant_uid = ? AND user_id = ?',
      [merchant_uid, session.user.id]
    );

    if (payments.length === 0) {
      connection.release();
      return NextResponse.json({ success: false, error: '결제 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    const payment = payments[0];

    // 포트원 V2 응답 형식: amount.total (V1은 amount였음)
    const paidAmount = paymentData.amount?.total ?? paymentData.amount;
    if (paidAmount !== payment.amount) {
      connection.release();
      return NextResponse.json({ success: false, error: '결제 금액이 일치하지 않습니다.' }, { status: 400 });
    }

    // 포트원 V2 상태: 'PAID' (V1은 'paid')
    if (paymentData.status !== 'PAID') {
      connection.release();
      return NextResponse.json({ success: false, error: '결제가 완료되지 않았습니다.' }, { status: 400 });
    }

    await connection.beginTransaction();

    // 결제 정보 업데이트
    await connection.execute(
      `UPDATE payments
       SET status = 'completed', imp_uid = ?, paid_at = NOW(),
           pg_provider = ?, pg_tid = ?, card_name = ?
       WHERE id = ?`,
      [
        actualPaymentId,
        paymentData.pgProvider || paymentData.channel?.pgProvider || null,
        paymentData.pgTxId || null,
        paymentData.method?.card?.name || null,
        payment.id
      ]
    );

    // 사용자 포인트 증가
    const [users] = await connection.execute(
      'SELECT points FROM users WHERE id = ? FOR UPDATE',
      [session.user.id]
    );

    const currentPoints = users[0]?.points || 0;
    const newPoints = currentPoints + payment.amount;

    await connection.execute(
      'UPDATE users SET points = ? WHERE id = ?',
      [newPoints, session.user.id]
    );

    // 포인트 거래 내역 기록
    await connection.execute(
      `INSERT INTO point_transactions
       (user_id, type, amount, balance_after, description, reference_type, reference_id, status)
       VALUES (?, 'charge', ?, ?, ?, 'payment', ?, 'completed')`,
      [
        session.user.id,
        payment.amount,
        newPoints,
        `포인트 충전 (${payment.payment_method || 'card'})`,
        payment.id
      ]
    );

    // 포트폴리오 구매 결제인 경우 채팅방 자동 생성
    if (payment.portfolio_id) {
      const [portfolios] = await connection.execute(
        'SELECT designer_id FROM portfolios WHERE id = ?',
        [payment.portfolio_id]
      );

      if (portfolios.length > 0) {
        const designerId = portfolios[0].designer_id;
        const user1_id = Math.min(parseInt(session.user.id), designerId);
        const user2_id = Math.max(parseInt(session.user.id), designerId);

        const [existingRooms] = await connection.execute(
          'SELECT id FROM chat_rooms WHERE user1_id = ? AND user2_id = ?',
          [user1_id, user2_id]
        );

        let roomId;
        if (existingRooms.length > 0) {
          roomId = existingRooms[0].id;
          await connection.execute(
            'UPDATE chat_rooms SET payment_id = ?, last_message = ?, last_message_at = NOW() WHERE id = ?',
            [payment.id, '결제가 완료되었습니다. 채팅을 시작하세요!', roomId]
          );
        } else {
          const [roomResult] = await connection.execute(
            `INSERT INTO chat_rooms (user1_id, user2_id, portfolio_id, payment_id, last_message, last_message_at)
             VALUES (?, ?, ?, ?, '결제가 완료되었습니다. 채팅을 시작하세요!', NOW())`,
            [user1_id, user2_id, payment.portfolio_id, payment.id]
          );
          roomId = roomResult.insertId;
        }

        await connection.execute(
          `INSERT INTO chat_messages (room_id, sender_id, message, is_read, created_at)
           VALUES (?, ?, '결제가 완료되었습니다! 요청사항이나 디자인 관련 내용을 공유해주세요.', 0, NOW())`,
          [roomId, session.user.id]
        );
      }
    }

    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      message: '결제가 완료되었습니다.',
      points: newPoints,
      payment_id: payment.id
    });
  } catch (error) {
    await connection.rollback().catch(() => {});
    connection.release();
    console.error('결제 검증 실패:', error);
    return NextResponse.json(
      { success: false, error: '결제 검증에 실패했습니다.' },
      { status: 500 }
    );
  }
}
