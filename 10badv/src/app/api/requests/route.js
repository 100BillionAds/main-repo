import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// GET: 의뢰 목록 조회
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    let query = `
      SELECT r.*, u.username as client_username, u.name as client_name
      FROM requests r
      LEFT JOIN users u ON r.client_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) { query += ' AND r.status = ?'; params.push(status); }
    if (clientId) { query += ' AND r.client_id = ?'; params.push(clientId); }

    // LIMIT/OFFSET는 일부 MySQL 호환 환경에서 바인딩 오류가 발생할 수 있어 안전한 정수 리터럴로 주입
    query += ` ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await pool.execute(query, params);

    let countQuery = 'SELECT COUNT(*) as total FROM requests WHERE 1=1';
    const countParams = [];
    if (status) { countQuery += ' AND status = ?'; countParams.push(status); }
    if (clientId) { countQuery += ' AND client_id = ?'; countParams.push(clientId); }
    const [countResult] = await pool.execute(countQuery, countParams);

    return NextResponse.json({
      success: true,
      requests: rows,
      pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) }
    });
  } catch (error) {
    console.error('의뢰 목록 조회 오류:', error);
    return NextResponse.json({ success: false, error: '의뢰 목록을 불러오는데 실패했습니다.' }, { status: 500 });
  }
}

// POST: 새 의뢰 생성
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category, budget, tags } = body;

    if (!title || !description) {
      return NextResponse.json({ success: false, error: '제목과 설명은 필수입니다.' }, { status: 400 });
    }

    const tagsJson = tags ? JSON.stringify(tags) : null;

    const [result] = await pool.execute(
      'INSERT INTO requests (client_id, title, description, category, budget, tags, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [session.user.id, title, description, category, budget || 0, tagsJson, 'OPEN']
    );

    const [rows] = await pool.execute('SELECT * FROM requests WHERE id = ?', [result.insertId]);
    return NextResponse.json({ success: true, request: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('의뢰 생성 오류:', error);
    return NextResponse.json({ success: false, error: '의뢰 생성에 실패했습니다.' }, { status: 500 });
  }
}
