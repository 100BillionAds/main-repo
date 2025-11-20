import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import mysql from 'mysql2/promise';

// MySQL 연결 설정
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'merk',
  database: '10badv'
};

// GET: 채팅방 메시지 조회
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const { roomId } = await params;
    const connection = await mysql.createConnection(dbConfig);
    
    // 채팅방 권한 확인
    const [rooms] = await connection.execute(
      'SELECT * FROM chat_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
      [roomId, session.user.id, session.user.id]
    );
    
    if (rooms.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 메시지 조회
    const [messages] = await connection.execute(`
      SELECT 
        cm.id,
        cm.sender_id,
        cm.message,
        cm.message_type,
        cm.file_url,
        cm.file_name,
        cm.file_size,
        cm.created_at,
        u.username as sender_name
      FROM chat_messages cm
      LEFT JOIN users u ON cm.sender_id = u.id
      WHERE cm.room_id = ?
      ORDER BY cm.created_at ASC
    `, [roomId]);
    
    // 읽음 처리 (상대방 메시지만)
    await connection.execute(
      'UPDATE chat_messages SET is_read = 1 WHERE room_id = ? AND sender_id != ? AND is_read = 0',
      [roomId, session.user.id]
    );
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('메시지 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: 메시지 전송
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const { roomId } = await params;
    const { message } = await request.json();
    
    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: '메시지를 입력해주세요.' },
        { status: 400 }
      );
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    // 채팅방 권한 확인
    const [rooms] = await connection.execute(
      'SELECT * FROM chat_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
      [roomId, session.user.id, session.user.id]
    );
    
    if (rooms.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '접근 권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 메시지 저장
    const [result] = await connection.execute(
      'INSERT INTO chat_messages (room_id, sender_id, message, is_read, created_at) VALUES (?, ?, ?, 0, NOW())',
      [roomId, session.user.id, message]
    );
    
    // 채팅방 마지막 메시지 업데이트
    await connection.execute(
      'UPDATE chat_rooms SET last_message = ?, last_message_at = NOW() WHERE id = ?',
      [message, roomId]
    );
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      messageId: result.insertId,
      message: '메시지가 전송되었습니다.'
    });
  } catch (error) {
    console.error('메시지 전송 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
