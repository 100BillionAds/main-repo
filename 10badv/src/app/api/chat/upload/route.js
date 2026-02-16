import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || '10badv';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const roomId = formData.get('roomId');

    if (!file || !roomId) {
      return NextResponse.json({ success: false, error: '파일과 채팅방 정보가 필요합니다.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ success: false, error: '파일 크기는 10MB를 초과할 수 없습니다.' }, { status: 400 });
    }

    const userId = parseInt(session.user.id);

    // 채팅방 참여자 확인
    const [rooms] = await pool.execute(
      'SELECT * FROM chat_rooms WHERE id = ? AND (user1_id = ? OR user2_id = ?)',
      [roomId, userId, userId]
    );

    if (rooms.length === 0) {
      return NextResponse.json({ success: false, error: '접근 권한이 없습니다.' }, { status: 403 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split('.').pop();
    const fileName = `chat/${roomId}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    });

    await s3Client.send(command);

    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-northeast-2'}.amazonaws.com/${fileName}`;

    // 파일 메시지 저장
    const [result] = await pool.execute(
      'INSERT INTO chat_messages (room_id, sender_id, message, message_type, file_url, file_name, file_size, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())',
      [roomId, userId, file.name, 'file', fileUrl, file.name, file.size]
    );

    await pool.execute(
      'UPDATE chat_rooms SET last_message = ?, last_message_at = NOW() WHERE id = ?',
      [`📎 ${file.name}`, roomId]
    );

    return NextResponse.json({
      success: true,
      messageId: result.insertId,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    return NextResponse.json({ success: false, error: '파일 업로드에 실패했습니다.' }, { status: 500 });
  }
}
