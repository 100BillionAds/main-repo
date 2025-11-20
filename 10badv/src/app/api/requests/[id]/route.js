import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { getServerSession } from 'next-auth';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'merk',
  database: '10badv'
};

// GET: 의뢰 상세 조회
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const connection = await mysql.createConnection(dbConfig);
    
    // 의뢰 정보 조회
    const [requestRows] = await connection.execute(
      `SELECT 
        r.*,
        u.username as client_username,
        u.name as client_name,
        u.email as client_email
      FROM requests r
      LEFT JOIN users u ON r.client_id = u.id
      WHERE r.id = ?`,
      [id]
    );
    
    if (requestRows.length === 0) {
      await connection.end();
      return NextResponse.json({ error: '의뢰를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 의뢰에 대한 제안 목록 조회
    const [proposalRows] = await connection.execute(
      `SELECT 
        p.*,
        u.username as designer_username,
        u.name as designer_name
      FROM proposals p
      LEFT JOIN users u ON p.designer_id = u.id
      WHERE p.request_id = ?
      ORDER BY p.created_at DESC`,
      [id]
    );
    
    await connection.end();
    
    const requestData = requestRows[0];
    requestData.proposals = proposalRows;
    
    return NextResponse.json(requestData);
  } catch (error) {
    console.error('의뢰 상세 조회 오류:', error);
    return NextResponse.json({ error: '의뢰 정보를 불러오는데 실패했습니다.' }, { status: 500 });
  }
}

// PATCH: 의뢰 수정
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await request.json();
    const connection = await mysql.createConnection(dbConfig);
    
    // 의뢰 소유자 확인
    const [rows] = await connection.execute(
      'SELECT client_id FROM requests WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      await connection.end();
      return NextResponse.json({ error: '의뢰를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    if (rows[0].client_id !== session.user.id) {
      await connection.end();
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }
    
    // 수정 가능한 필드
    const updates = [];
    const values = [];
    
    if (body.title !== undefined) {
      updates.push('title = ?');
      values.push(body.title);
    }
    if (body.description !== undefined) {
      updates.push('description = ?');
      values.push(body.description);
    }
    if (body.category !== undefined) {
      updates.push('category = ?');
      values.push(body.category);
    }
    if (body.budget !== undefined) {
      updates.push('budget = ?');
      values.push(body.budget);
    }
    if (body.status !== undefined) {
      updates.push('status = ?');
      values.push(body.status);
    }
    if (body.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(body.tags));
    }
    
    if (updates.length === 0) {
      await connection.end();
      return NextResponse.json({ error: '수정할 내용이 없습니다.' }, { status: 400 });
    }
    
    values.push(id);
    
    await connection.execute(
      `UPDATE requests SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    // 수정된 의뢰 조회
    const [updatedRows] = await connection.execute(
      'SELECT * FROM requests WHERE id = ?',
      [id]
    );
    
    await connection.end();
    
    return NextResponse.json(updatedRows[0]);
  } catch (error) {
    console.error('의뢰 수정 오류:', error);
    return NextResponse.json({ error: '의뢰 수정에 실패했습니다.' }, { status: 500 });
  }
}

// DELETE: 의뢰 삭제
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    
    const { id } = await params;
    const connection = await mysql.createConnection(dbConfig);
    
    // 의뢰 소유자 확인
    const [rows] = await connection.execute(
      'SELECT client_id FROM requests WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      await connection.end();
      return NextResponse.json({ error: '의뢰를 찾을 수 없습니다.' }, { status: 404 });
    }
    
    if (rows[0].client_id !== session.user.id && session.user.role !== 'admin') {
      await connection.end();
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }
    
    // 의뢰 삭제 (CASCADE로 proposals도 자동 삭제됨)
    await connection.execute('DELETE FROM requests WHERE id = ?', [id]);
    await connection.end();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('의뢰 삭제 오류:', error);
    return NextResponse.json({ error: '의뢰 삭제에 실패했습니다.' }, { status: 500 });
  }
}
