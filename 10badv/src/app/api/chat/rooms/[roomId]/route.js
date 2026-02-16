import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// DELETE: 채팅방 삭제
export async function DELETE(request, { params }) {
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

    await pool.execute('DELETE FROM chat_messages WHERE room_id = ?', [roomId]);
    await pool.execute('DELETE FROM chat_rooms WHERE id = ?', [roomId]);

    return NextResponse.json({ success: true, message: '채팅방이 삭제되었습니다.' });
  } catch (error) {
    console.error('채팅방 삭제 실패:', error);
    return NextResponse.json({ success: false, error: '채팅방 삭제에 실패했습니다.' }, { status: 500 });
  }
}
