import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// GET: 단일 의뢰 조회
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const [rows] = await pool.execute(
      `SELECT r.*, u.username as client_username, u.name as client_name
       FROM requests r
       LEFT JOIN users u ON r.client_id = u.id
       WHERE r.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: '의뢰를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 해당 의뢰에 대한 제안 목록도 함께 조회
    const [proposals] = await pool.execute(
      `SELECT p.*, u.username as designer_username, u.name as designer_name
       FROM proposals p
       LEFT JOIN users u ON p.designer_id = u.id
       WHERE p.request_id = ?
       ORDER BY p.created_at DESC`,
      [id]
    );

    return NextResponse.json({ success: true, request: rows[0], proposals });
  } catch (error) {
    console.error('의뢰 조회 오류:', error);
    return NextResponse.json({ success: false, error: '의뢰를 불러오는데 실패했습니다.' }, { status: 500 });
  }
}

// PATCH: 의뢰 수정
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;

    // 의뢰 소유자 확인
    const [existing] = await pool.execute('SELECT client_id, status FROM requests WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: '의뢰를 찾을 수 없습니다.' }, { status: 404 });
    }

    const userId = parseInt(session.user.id);
    if (existing[0].client_id !== userId && session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, category, budget, tags, status } = body;

    // 상태 전환 검증
    if (status) {
      const validTransitions = {
        'OPEN': ['CANCELLED'],
        'MATCHED': ['COMPLETED', 'CANCELLED'],
        'COMPLETED': [],
        'CANCELLED': []
      };
      if (!validTransitions[existing[0].status]?.includes(status)) {
        return NextResponse.json({ success: false, error: '유효하지 않은 상태 전환입니다.' }, { status: 400 });
      }
    }

    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (budget !== undefined) { updates.push('budget = ?'); values.push(budget); }
    if (tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(tags)); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: '수정할 내용이 없습니다.' }, { status: 400 });
    }

    values.push(id);
    await pool.execute(`UPDATE requests SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.execute('SELECT * FROM requests WHERE id = ?', [id]);
    return NextResponse.json({ success: true, request: updated[0] });
  } catch (error) {
    console.error('의뢰 수정 오류:', error);
    return NextResponse.json({ success: false, error: '의뢰 수정에 실패했습니다.' }, { status: 500 });
  }
}

// DELETE: 의뢰 삭제
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;

    const [existing] = await pool.execute('SELECT client_id, status FROM requests WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json({ success: false, error: '의뢰를 찾을 수 없습니다.' }, { status: 404 });
    }

    const userId = parseInt(session.user.id);
    if (existing[0].client_id !== userId && session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 });
    }

    if (existing[0].status === 'MATCHED') {
      return NextResponse.json({ success: false, error: '매칭된 의뢰는 삭제할 수 없습니다.' }, { status: 400 });
    }

    await pool.execute('DELETE FROM proposals WHERE request_id = ?', [id]);
    await pool.execute('DELETE FROM requests WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: '의뢰가 삭제되었습니다.' });
  } catch (error) {
    console.error('의뢰 삭제 오류:', error);
    return NextResponse.json({ success: false, error: '의뢰 삭제에 실패했습니다.' }, { status: 500 });
  }
}
