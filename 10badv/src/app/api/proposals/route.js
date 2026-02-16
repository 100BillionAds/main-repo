import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// POST: 제안 생성 (디자이너가 의뢰에 제안)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    if (session.user.role !== 'designer') {
      return NextResponse.json({ error: '디자이너만 제안할 수 있습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, message, offerPrice } = body;

    if (!requestId || !message || !offerPrice) {
      return NextResponse.json({ error: '모든 필드를 입력해주세요.' }, { status: 400 });
    }

    // 의뢰가 OPEN 상태인지 확인
    const [requestRows] = await pool.execute(
      'SELECT status FROM requests WHERE id = ?',
      [requestId]
    );

    if (requestRows.length === 0) {
      return NextResponse.json({ error: '의뢰를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (requestRows[0].status !== 'OPEN') {
      return NextResponse.json({ error: '이미 마감된 의뢰입니다.' }, { status: 400 });
    }

    // 이미 제안했는지 확인
    const [existingProposals] = await pool.execute(
      'SELECT id FROM proposals WHERE request_id = ? AND designer_id = ?',
      [requestId, session.user.id]
    );

    if (existingProposals.length > 0) {
      return NextResponse.json({ error: '이미 제안하셨습니다.' }, { status: 400 });
    }

    // 제안 생성
    const [result] = await pool.execute(
      'INSERT INTO proposals (request_id, designer_id, message, offer_price, status) VALUES (?, ?, ?, ?, ?)',
      [requestId, session.user.id, message, offerPrice, 'PENDING']
    );

    // 생성된 제안 조회
    const [proposalRows] = await pool.execute(
      `SELECT p.*, u.username as designer_username, u.name as designer_name
       FROM proposals p
       LEFT JOIN users u ON p.designer_id = u.id
       WHERE p.id = ?`,
      [result.insertId]
    );

    return NextResponse.json({ success: true, proposal: proposalRows[0] }, { status: 201 });
  } catch (error) {
    console.error('제안 생성 오류:', error);
    return NextResponse.json({ error: '제안 생성에 실패했습니다.' }, { status: 500 });
  }
}

// GET: 제안 목록 조회
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const designerId = searchParams.get('designerId');

    let query = `
      SELECT p.*, u.username as designer_username, u.name as designer_name
      FROM proposals p
      LEFT JOIN users u ON p.designer_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (requestId) { query += ' AND p.request_id = ?'; params.push(requestId); }
    if (designerId) { query += ' AND p.designer_id = ?'; params.push(designerId); }

    query += ' ORDER BY p.created_at DESC';

    const [rows] = await pool.execute(query, params);
    return NextResponse.json({ success: true, proposals: rows });
  } catch (error) {
    console.error('제안 목록 조회 오류:', error);
    return NextResponse.json({ error: '제안 목록을 불러오는데 실패했습니다.' }, { status: 500 });
  }
}
