import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// GET: 사용자의 채팅방 목록 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const [rooms] = await pool.execute(`
      SELECT
        cr.id, cr.user1_id, cr.user2_id, cr.last_message, cr.last_message_at,
        cr.portfolio_id, cr.transaction_id,
        CASE WHEN cr.user1_id = ? THEN u2.username ELSE u1.username END as other_user_name,
        CASE WHEN cr.user1_id = ? THEN u2.name ELSE u1.name END as other_user_display_name,
        CASE WHEN cr.user1_id = ? THEN u2.id ELSE u1.id END as other_user_id,
        CASE WHEN cr.user1_id = ? THEN u2.avatar_url ELSE u1.avatar_url END as other_user_avatar,
        p.title as portfolio_title,
        t.status as transaction_status,
        t.buyer_id as transaction_buyer_id,
        t.designer_id as transaction_designer_id,
        (SELECT COUNT(*) FROM chat_messages WHERE room_id = cr.id AND sender_id != ? AND is_read = 0) as unread_count
      FROM chat_rooms cr
      LEFT JOIN users u1 ON cr.user1_id = u1.id
      LEFT JOIN users u2 ON cr.user2_id = u2.id
      LEFT JOIN portfolios p ON cr.portfolio_id = p.id
      LEFT JOIN transactions t ON cr.transaction_id = t.id
      WHERE cr.user1_id = ? OR cr.user2_id = ?
      ORDER BY cr.last_message_at DESC
    `, [userId, userId, userId, userId, userId, userId, userId]);

    return NextResponse.json({
      success: true,
      rooms: rooms.map(room => ({
        id: room.id,
        other_user_name: room.other_user_display_name || room.other_user_name,
        other_user_id: room.other_user_id,
        other_user_avatar: room.other_user_avatar,
        last_message: room.last_message,
        last_message_time: room.last_message_at,
        portfolio_title: room.portfolio_title,
        unread_count: room.unread_count || 0,
        transaction_id: room.transaction_id,
        transaction_status: room.transaction_status,
        transaction_buyer_id: room.transaction_buyer_id,
        transaction_designer_id: room.transaction_designer_id
      }))
    });
  } catch (error) {
    console.error('채팅방 목록 조회 실패:', error);
    return NextResponse.json({ success: false, error: '채팅방 목록 조회에 실패했습니다.' }, { status: 500 });
  }
}

// POST: 채팅방 생성 또는 기존 방 찾기
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { designerId, portfolioId, transactionId, initialMessage } = await request.json();

    if (!designerId) {
      return NextResponse.json({ success: false, error: '디자이너 ID가 필요합니다.' }, { status: 400 });
    }

    const userId = parseInt(session.user.id);
    const targetId = parseInt(designerId);

    if (targetId === userId) {
      return NextResponse.json({ success: false, error: '자기 자신과는 채팅할 수 없습니다.' }, { status: 400 });
    }

    const user1_id = Math.min(userId, targetId);
    const user2_id = Math.max(userId, targetId);

    const [existingRooms] = await pool.execute(
      'SELECT * FROM chat_rooms WHERE user1_id = ? AND user2_id = ?',
      [user1_id, user2_id]
    );

    let roomId;

    if (existingRooms.length > 0) {
      roomId = existingRooms[0].id;

      if (transactionId && !existingRooms[0].transaction_id) {
        await pool.execute('UPDATE chat_rooms SET transaction_id = ? WHERE id = ?', [transactionId, roomId]);
      }

      if (initialMessage) {
        await pool.execute(
          'UPDATE chat_rooms SET last_message = ?, last_message_at = NOW() WHERE id = ?',
          [initialMessage, roomId]
        );
      }
    } else {
      const [result] = await pool.execute(
        'INSERT INTO chat_rooms (user1_id, user2_id, portfolio_id, transaction_id, last_message, last_message_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [user1_id, user2_id, portfolioId || null, transactionId || null, initialMessage || '채팅을 시작했습니다.']
      );
      roomId = result.insertId;
    }

    if (initialMessage) {
      await pool.execute(
        'INSERT INTO chat_messages (room_id, sender_id, message, is_read, created_at) VALUES (?, ?, ?, 0, NOW())',
        [roomId, userId, initialMessage]
      );
    }

    return NextResponse.json({ success: true, roomId, message: '채팅방이 생성되었습니다.' });
  } catch (error) {
    console.error('채팅방 생성 실패:', error);
    return NextResponse.json({ success: false, error: '채팅방 생성에 실패했습니다.' }, { status: 500 });
  }
}
