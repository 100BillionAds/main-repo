import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { getServerSession } from 'next-auth';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'merk',
  database: '10badv'
};

// GET: 의뢰 목록 조회
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // OPEN, MATCHED, COMPLETED, CANCELLED
    const clientId = searchParams.get('clientId'); // 특정 사용자의 의뢰만 조회
    
    const connection = await mysql.createConnection(dbConfig);
    
    let query = `
      SELECT 
        r.*,
        u.username as client_username,
        u.name as client_name
      FROM requests r
      LEFT JOIN users u ON r.client_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    
    if (clientId) {
      query += ' AND r.client_id = ?';
      params.push(clientId);
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    const [rows] = await connection.execute(query, params);
    await connection.end();
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('의뢰 목록 조회 오류:', error);
    return NextResponse.json({ error: '의뢰 목록을 불러오는데 실패했습니다.' }, { status: 500 });
  }
}

// POST: 새 의뢰 생성
export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    
    const body = await request.json();
    const { title, description, category, budget, tags } = body;
    
    if (!title || !description) {
      return NextResponse.json({ error: '제목과 설명은 필수입니다.' }, { status: 400 });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    // tags를 JSON 문자열로 변환
    const tagsJson = tags ? JSON.stringify(tags) : null;
    
    const [result] = await connection.execute(
      `INSERT INTO requests (client_id, title, description, category, budget, tags, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'OPEN')`,
      [session.user.id, title, description, category, budget, tagsJson]
    );
    
    // 생성된 의뢰 정보 조회
    const [rows] = await connection.execute(
      'SELECT * FROM requests WHERE id = ?',
      [result.insertId]
    );
    
    await connection.end();
    
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('의뢰 생성 오류:', error);
    return NextResponse.json({ error: '의뢰 생성에 실패했습니다.' }, { status: 500 });
  }
}
