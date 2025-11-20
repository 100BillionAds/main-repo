import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { getServerSession } from 'next-auth';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'merk',
  database: '10badv'
};

// POST: 제안 생성 (디자이너가 의뢰에 제안)
export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    
    // 디자이너만 제안 가능
    if (session.user.role !== 'designer') {
      return NextResponse.json({ error: '디자이너만 제안할 수 있습니다.' }, { status: 403 });
    }
    
    const body = await request.json();
    const { requestId, message, offerPrice } = body;
    
    if (!requestId || !message || !offerPrice) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    // 의뢰가 OPEN 상태인지 확인
    const [requestRows] = await connection.execute(
      'SELECT status FROM requests WHERE id = ?',
      [requestId]
    );
    
    if (requestRows.length === 0) {
      await connection.end();
      return NextResponse.json({ error: '의뢰를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    if (requestRows[0].status !== 'OPEN') {
      await connection.end();
      return NextResponse.json({ error: '이미 마감된 의뢰입니다.' }, { status: 400 });
    }
    
    // 이미 제안했는지 확인
    const [existingProposals] = await connection.execute(
      'SELECT id FROM proposals WHERE request_id = ? AND designer_id = ?',
      [requestId, session.user.id]
    );
    
    if (existingProposals.length > 0) {
      await connection.end();
      return NextResponse.json({ error: '이미 제안하셨습니다.' }, { status: 400 });
    }
    
    // 제안 생성
    const [result] = await connection.execute(
      'INSERT INTO proposals (request_id, designer_id, message, offer_price, status) VALUES (?, ?, ?, ?, ?)',
      [requestId, session.user.id, message, offerPrice, 'PENDING']
    );
    
    // 생성된 제안 조회
    const [proposalRows] = await connection.execute(
      `SELECT 
        p.*,
        u.username as designer_username,
        u.name as designer_name
      FROM proposals p
      LEFT JOIN users u ON p.designer_id = u.id
      WHERE p.id = ?`,
      [result.insertId]
    );
    
    await connection.end();
    
    return NextResponse.json(proposalRows[0], { status: 201 });
  } catch (error) {
    console.error('제안 생성 오류:', error);
    return NextResponse.json({ error: '제안 생성에 실패했습니다.' }, { status: 500 });
  }
}
