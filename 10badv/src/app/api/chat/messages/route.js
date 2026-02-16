import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// GET: 메시지 조회
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!roomId) {
      return NextResponse.json({ success: false, error: '채팅방 ID가 필요합니다' }, { status: 400 });
    }

    // 채팅방 접근 권한 확인
    const [rooms] = await pool.execute(
      'SELECT id FROM chat_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
      [roomId, userId, userId]
    );

    if (rooms.length === 0) {
      return NextResponse.json({ success: false, error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const [messages] = await pool.execute(
      `SELECT cm.*, u.username as sender_name
       FROM chat_messages cm
       LEFT JOIN users u ON cm.sender_id = u.id
       WHERE cm.room_id = ?
       ORDER BY cm.created_at DESC
       LIMIT ? OFFSET ?`,
      [roomId, limit, offset]
    );

    // 읽음 처리
    await pool.execute(
      'UPDATE chat_messages SET is_read = 1 WHERE room_id = ? AND sender_id != ? AND is_read = 0',
      [roomId, userId]
    );

    return NextResponse.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error('메시지 조회 실패:', error);
    return NextResponse.json({ success: false, error: '메시지 조회 실패' }, { status: 500 });
  }
}

// POST: 메시지 전송
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { roomId, content, messageType = 'text', fileUrl, fileName, fileSize } = body;

    if (!roomId || (!content && !fileUrl)) {
      return NextResponse.json({ success: false, error: '필수 정보가 누락되었습니다' }, { status: 400 });
    }

    // 채팅방 접근 권한 확인
    const [rooms] = await pool.execute(
      'SELECT user1_id, user2_id FROM chat_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
      [roomId, userId, userId]
    );

    if (rooms.length === 0) {
      return NextResponse.json({ success: false, error: '접근 권한이 없습니다' }, { status: 403 });
    }

    const messageText = content || (messageType === 'image' ? '이미지' : '파일');
    const [result] = await pool.execute(
      `INSERT INTO chat_messages (room_id, sender_id, message, message_type, file_url, file_name, file_size, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [roomId, userId, messageText, messageType, fileUrl || null, fileName || null, fileSize || null]
    );

    const lastMessage = messageType === 'image' ? '이미지' : (messageType === 'file' ? '파일' : content);
    await pool.execute(
      'UPDATE chat_rooms SET last_message = ?, last_message_at = NOW() WHERE id = ?',
      [lastMessage, roomId]
    );

    return NextResponse.json({ success: true, messageId: result.insertId });
  } catch (error) {
    console.error('메시지 전송 실패:', error);
    return NextResponse.json({ success: false, error: '메시지 전송 실패' }, { status: 500 });
  }
}
