import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import mysql from 'mysql2/promise';

// MySQL 연결 설정
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || 'merk',
  database: process.env.DATABASE_NAME || '10badv'
};

// GET: 사용자의 채팅방 목록 조회
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    const userId = session.user.id;
    
    // 내 채팅방 목록 조회 (거래 정보 포함)
    const [rooms] = await connection.execute(`
      SELECT 
        cr.id,
        cr.user1_id,
        cr.user2_id,
        cr.last_message,
        cr.last_message_at,
        cr.portfolio_id,
        cr.transaction_id,
        CASE 
          WHEN cr.user1_id = ? THEN u2.username
          ELSE u1.username
        END as other_user_name,
        CASE 
          WHEN cr.user1_id = ? THEN u2.name
          ELSE u1.name
        END as other_user_display_name,
        CASE 
          WHEN cr.user1_id = ? THEN cr.user2_id
          ELSE cr.user1_id
        END as other_user_id,
        CASE
          WHEN cr.portfolio_id IS NOT NULL AND EXISTS(
            SELECT 1 FROM transactions WHERE portfolio_id = cr.portfolio_id AND buyer_id = (
              CASE 
                WHEN cr.user1_id = ? THEN cr.user2_id
                ELSE cr.user1_id
              END
            ) AND status != 'cancelled'
          ) THEN 1
          ELSE 0
        END as other_is_buyer,
        CASE
          WHEN cr.portfolio_id IS NOT NULL AND EXISTS(
            SELECT 1 FROM transactions WHERE portfolio_id = cr.portfolio_id AND buyer_id = ? AND status != 'cancelled'
          ) THEN 1
          ELSE 0
        END as i_am_buyer,
        p.title as portfolio_title,
        t.status as transaction_status,
        t.buyer_id as transaction_buyer_id,
        t.designer_id as transaction_designer_id,
        (SELECT COUNT(*) FROM chat_messages WHERE room_id = cr.id AND sender_id != ? AND is_read = FALSE) as unread_count
      FROM chat_rooms cr
      LEFT JOIN users u1 ON cr.user1_id = u1.id
      LEFT JOIN users u2 ON cr.user2_id = u2.id
      LEFT JOIN portfolios p ON cr.portfolio_id = p.id
      LEFT JOIN transactions t ON cr.transaction_id = t.id
      WHERE cr.user1_id = ? OR cr.user2_id = ?
      ORDER BY cr.last_message_at DESC
    `, [userId, userId, userId, userId, userId, userId, userId, userId]);
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      rooms: rooms.map(room => ({
        id: room.id,
        other_user_name: room.other_user_display_name || room.other_user_name,
        other_user_id: room.other_user_id,
        other_user_image: room.other_user_image,
        last_message: room.last_message,
        last_message_time: room.last_message_at,
        portfolio_title: room.portfolio_title,
        other_is_buyer: room.other_is_buyer ? true : false,
        i_am_buyer: room.i_am_buyer ? true : false,
        payment_id: room.payment_id,
        unread_count: room.unread_count || 0,
        transaction_id: room.transaction_id,
        transaction_status: room.transaction_status,
        transaction_buyer_id: room.transaction_buyer_id,
        transaction_designer_id: room.transaction_designer_id
      }))
    });
  } catch (error) {
    console.error('채팅방 목록 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: 채팅방 생성 또는 기존 방 찾기
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const { designerId, portfolioId, transactionId, initialMessage } = await request.json();
    
    if (!designerId) {
      return NextResponse.json(
        { success: false, error: '디자이너 ID가 필요합니다.' },
        { status: 400 }
      );
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    const user1_id = Math.min(session.user.id, designerId);
    const user2_id = Math.max(session.user.id, designerId);
    
    // 기존 채팅방 확인
    const [existingRooms] = await connection.execute(
      'SELECT * FROM chat_rooms WHERE user1_id = ? AND user2_id = ?',
      [user1_id, user2_id]
    );
    
    let roomId;
    
    if (existingRooms.length > 0) {
      // 기존 방이 있으면 그 방 사용
      roomId = existingRooms[0].id;
      
      // transaction_id 업데이트 (없었다면)
      if (transactionId && !existingRooms[0].transaction_id) {
        await connection.execute(
          'UPDATE chat_rooms SET transaction_id = ? WHERE id = ?',
          [transactionId, roomId]
        );
      }
      
      // 마지막 메시지 업데이트
      if (initialMessage) {
        await connection.execute(
          'UPDATE chat_rooms SET last_message = ?, last_message_at = NOW() WHERE id = ?',
          [initialMessage, roomId]
        );
      }
    } else {
      // 새 채팅방 생성
      const [result] = await connection.execute(
        'INSERT INTO chat_rooms (user1_id, user2_id, portfolio_id, transaction_id, last_message, last_message_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [user1_id, user2_id, portfolioId || null, transactionId || null, initialMessage || '채팅을 시작했습니다.']
      );
      
      roomId = result.insertId;
    }
    
    // 초기 메시지가 있으면 저장
    if (initialMessage) {
      await connection.execute(
        'INSERT INTO chat_messages (room_id, sender_id, message, is_read, created_at) VALUES (?, ?, ?, 0, NOW())',
        [roomId, session.user.id, initialMessage]
      );
    }
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      roomId,
      message: '채팅방이 생성되었습니다.'
    });
  } catch (error) {
    console.error('채팅방 생성 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

