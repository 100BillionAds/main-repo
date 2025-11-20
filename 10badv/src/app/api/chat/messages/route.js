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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!roomId) {
      return NextResponse.json({ success: false, error: '채팅방 ID가 필요합니다' }, { status: 400 });
    }

    const connection = await mysql.createConnection(dbConfig);

    // 채팅방 권한 확인 (user1_id, user2_id 사용)
    const [rooms] = await connection.execute(
      `SELECT id, user1_id, user2_id FROM chat_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [roomId, userId, userId]
    );

    if (rooms.length === 0) {
      await connection.end();
      return NextResponse.json({ success: false, error: '접근 권한이 없습니다' }, { status: 403 });
    }

    // 메시지 조회 (message_type, file_url 등 포함)
    const [messages] = await connection.execute(
      `SELECT cm.*, 
              COALESCE(cm.message, cm.content) as message,
              cm.message_type,
              cm.file_url,
              cm.file_name,
              cm.file_size,
              u.username as sender_name, 
              u.profile_image as sender_image
       FROM chat_messages cm
       LEFT JOIN users u ON cm.sender_id = u.id
       WHERE cm.room_id = ?
       ORDER BY cm.created_at DESC
       LIMIT ? OFFSET ?`,
      [roomId, limit, offset]
    );

    // 읽음 처리 (내가 받은 메시지)
    await connection.execute(
      `UPDATE chat_messages 
       SET is_read = 1
       WHERE room_id = ? AND sender_id != ? AND is_read = 0`,
      [roomId, userId]
    );

    await connection.end();

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

    const connection = await mysql.createConnection(dbConfig);

    // 채팅방 권한 확인
    const [rooms] = await connection.execute(
      `SELECT user1_id, user2_id FROM chat_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)`,
      [roomId, userId, userId]
    );

    if (rooms.length === 0) {
      await connection.end();
      return NextResponse.json({ success: false, error: '접근 권한이 없습니다' }, { status: 403 });
    }

    // 메시지 저장 (message 컬럼 사용, message_type/file_url은 있으면 저장)
    const messageText = content || (messageType === 'image' ? '📷 이미지' : '📎 파일');
    const [result] = await connection.execute(
      `INSERT INTO chat_messages (room_id, sender_id, message, message_type, file_url, file_name, file_size, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [roomId, userId, messageText, messageType, fileUrl || null, fileName || null, fileSize || null]
    );

    const messageId = result.insertId;

    // 채팅방 마지막 메시지 업데이트
    const lastMessage = messageType === 'image' ? '📷 이미지' : (messageType === 'file' ? '📎 파일' : content);
    await connection.execute(
      `UPDATE chat_rooms 
       SET last_message = ?, last_message_at = NOW() 
       WHERE id = ?`,
      [lastMessage, roomId]
    );

    await connection.end();

    return NextResponse.json({ success: true, messageId });
  } catch (error) {
    console.error('메시지 전송 실패:', error);
    return NextResponse.json({ success: false, error: '메시지 전송 실패' }, { status: 500 });
  }
}
