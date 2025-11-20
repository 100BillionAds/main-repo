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

// DELETE: 채팅방 삭제
export async function DELETE(request, { params }) {
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
    
    // 채팅방의 모든 메시지 삭제
    await connection.execute(
      'DELETE FROM chat_messages WHERE room_id = ?',
      [roomId]
    );
    
    // 채팅방 삭제
    await connection.execute(
      'DELETE FROM chat_rooms WHERE id = ?',
      [roomId]
    );
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      message: '채팅방이 삭제되었습니다.'
    });
  } catch (error) {
    console.error('채팅방 삭제 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
