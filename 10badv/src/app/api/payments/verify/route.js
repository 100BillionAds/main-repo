import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import mysql from 'mysql2/promise';
import axios from 'axios';

// MySQL 연결 설정
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || 'merk',
  database: process.env.DATABASE_NAME || '10badv',
};

// 포트원 API 설정
const PORTONE_STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;

// 포트원 V2 API에서 액세스 토큰 발급
async function getPortOneAccessToken() {
  try {
    const response = await axios.post('https://api.portone.io/login/api-secret', {
      apiSecret: PORTONE_API_SECRET
    });
    
    return response.data.accessToken;
  } catch (error) {
    console.error('포트원 액세스 토큰 발급 실패:', error);
    throw new Error('결제 서비스 인증 실패');
  }
}

// 포트원 V2 API로 결제 정보 검증
async function verifyPaymentFromPortOne(paymentId) {
  try {
    const access_token = await getPortOneAccessToken();
    
    const response = await axios.get(
      `https://api.portone.io/payments/${paymentId}`,
      {
        headers: { 
          'Authorization': `Bearer ${access_token}` 
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('포트원 결제 검증 실패:', error);
    throw new Error('결제 검증 실패');
  }
}

// POST: 결제 완료 후 검증
export async function POST(request) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const { imp_uid, merchant_uid } = await request.json();
    
    if (!imp_uid || !merchant_uid) {
      return NextResponse.json(
        { success: false, error: '필수 결제 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }
    
    // 포트원 API로 결제 정보 검증
    const paymentData = await verifyPaymentFromPortOne(imp_uid);
    
    // DB에서 결제 정보 조회
    const [payments] = await connection.execute(
      'SELECT * FROM payments WHERE merchant_uid = ? AND user_id = ?',
      [merchant_uid, session.user.id]
    );
    
    if (payments.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '결제 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    const payment = payments[0];
    
    // 결제 금액 검증
    if (paymentData.amount !== payment.amount) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '결제 금액이 일치하지 않습니다.' },
        { status: 400 }
      );
    }
    
    // 결제 상태 확인
    if (paymentData.status !== 'paid') {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '결제가 완료되지 않았습니다.' },
        { status: 400 }
      );
    }
    
    await connection.beginTransaction();
    
    // 결제 정보 업데이트
    await connection.execute(
      `UPDATE payments 
       SET status = 'completed', imp_uid = ?, paid_at = NOW(), 
           pg_provider = ?, pg_tid = ?, card_name = ? 
       WHERE id = ?`,
      [
        imp_uid,
        paymentData.pg_provider,
        paymentData.pg_tid,
        paymentData.card_name,
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
        `포인트 충전 (${payment.payment_method})`,
        payment.id
      ]
    );

    // 🆕 포트폴리오 구매 결제인 경우 채팅방 자동 생성
    if (payment.portfolio_id) {
      // 포트폴리오 정보 조회 (디자이너 ID 가져오기)
      const [portfolios] = await connection.execute(
        'SELECT user_id as designer_id FROM portfolios WHERE id = ?',
        [payment.portfolio_id]
      );

      if (portfolios.length > 0) {
        const designerId = portfolios[0].designer_id;
        const user1_id = Math.min(session.user.id, designerId);
        const user2_id = Math.max(session.user.id, designerId);

        // 기존 채팅방 확인
        const [existingRooms] = await connection.execute(
          'SELECT id FROM chat_rooms WHERE user1_id = ? AND user2_id = ?',
          [user1_id, user2_id]
        );

        let roomId;
        if (existingRooms.length > 0) {
          // 기존 채팅방에 payment_id 업데이트
          roomId = existingRooms[0].id;
          await connection.execute(
            'UPDATE chat_rooms SET payment_id = ?, last_message = ?, last_message_at = NOW() WHERE id = ?',
            [payment.id, '🎉 결제가 완료되었습니다. 채팅을 시작하세요!', roomId]
          );
        } else {
          // 새 채팅방 생성
          const [roomResult] = await connection.execute(
            `INSERT INTO chat_rooms (user1_id, user2_id, portfolio_id, payment_id, last_message, last_message_at) 
             VALUES (?, ?, ?, ?, '🎉 결제가 완료되었습니다. 채팅을 시작하세요!', NOW())`,
            [user1_id, user2_id, payment.portfolio_id, payment.id]
          );
          roomId = roomResult.insertId;
        }

        // 환영 메시지 자동 전송
        await connection.execute(
          `INSERT INTO chat_messages (room_id, sender_id, message, is_read, created_at) 
           VALUES (?, ?, '결제가 완료되었습니다! 요청사항이나 디자인 관련 내용을 공유해주세요. 📋', 0, NOW())`,
          [roomId, session.user.id]
        );
      }
    }
    
    await connection.commit();
    await connection.end();
    
    return NextResponse.json({
      success: true,
      message: '결제가 완료되었습니다.',
      points: newPoints,
      payment_id: payment.id
    });
  } catch (error) {
    await connection.rollback();
    await connection.end();
    console.error('결제 검증 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
