import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// GET: 채팅방 메시지 조회
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { roomId } = await params;
    const userId = parseInt(session.user.id);

    const [rooms] = await pool.execute(
      'SELECT * FROM chat_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
      [roomId, userId, userId]
    );

    if (rooms.length === 0) {
      return NextResponse.json({ success: false, error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    const [messages] = await pool.execute(`
      SELECT cm.id, cm.sender_id, cm.message, cm.message_type, cm.file_url, cm.file_name, cm.file_size, cm.created_at, u.username as sender_name
      FROM chat_messages cm
      LEFT JOIN users u ON cm.sender_id = u.id
      WHERE cm.room_id = ?
      ORDER BY cm.created_at ASC
    `, [roomId]);

    await pool.execute(
      'UPDATE chat_messages SET is_read = 1 WHERE room_id = ? AND sender_id != ? AND is_read = 0',
      [roomId, userId]
    );

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('메시지 조회 실패:', error);
    return NextResponse.json({ success: false, error: '메시지 조회에 실패했습니다.' }, { status: 500 });
  }
}

// POST: 메시지 전송
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { roomId } = await params;
    const { message } = await request.json();
    const userId = parseInt(session.user.id);

    if (!message || !message.trim()) {
      return NextResponse.json({ success: false, error: '메시지를 입력해주세요.' }, { status: 400 });
    }

    const [rooms] = await pool.execute(
      'SELECT * FROM chat_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
      [roomId, userId, userId]
    );

    if (rooms.length === 0) {
      return NextResponse.json({ success: false, error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    const [result] = await pool.execute(
      'INSERT INTO chat_messages (room_id, sender_id, message, is_read, created_at) VALUES (?, ?, ?, 0, NOW())',
      [roomId, userId, message]
    );

    await pool.execute(
      'UPDATE chat_rooms SET last_message = ?, last_message_at = NOW() WHERE id = ?',
      [message, roomId]
    );

    return NextResponse.json({ success: true, messageId: result.insertId });
  } catch (error) {
    console.error('메시지 전송 실패:', error);
    return NextResponse.json({ success: false, error: '메시지 전송에 실패했습니다.' }, { status: 500 });
  }
}
