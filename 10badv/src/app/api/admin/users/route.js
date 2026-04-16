import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// GET: 전체 사용자 목록 (관리자 전용)
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 20, 100);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const offset = (page - 1) * limit;

    let query = 'SELECT id, username, name, email, role, phone, bio, avatar_url, status, points, created_at FROM users';
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    const conditions = [];
    const params = [];

    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }

    if (search) {
      conditions.push('(username LIKE ? OR name LIKE ? OR email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      const where = ' WHERE ' + conditions.join(' AND ');
      query += where;
      countQuery += where;
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const countParams = [...params];

    const [users] = await pool.execute(query, params);
    const [countResult] = await pool.execute(countQuery, countParams);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    console.error('사용자 조회 실패:', error);
    return NextResponse.json({ success: false, error: '사용자 조회에 실패했습니다.' }, { status: 500 });
  }
}

// PATCH: 사용자 상태/역할 변경 (관리자 전용)
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const body = await request.json();
    const userId = body.userId;
    const role = body.role ?? body.updates?.role;
    const rawStatus = body.status ?? body.updates?.status;

    if (!userId) {
      return NextResponse.json({ success: false, error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    const fields = [];
    const params = [];

    if (role) {
      const validRoles = ['user', 'designer', 'admin'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ success: false, error: '유효하지 않은 역할입니다.' }, { status: 400 });
      }
      fields.push('role = ?');
      params.push(role);
    }

    if (rawStatus) {
      const normalizedStatus = rawStatus === 'blacklisted' || rawStatus === 'banned'
        ? 'suspended'
        : rawStatus;
      const validStatuses = ['active', 'suspended', 'deleted'];
      if (!validStatuses.includes(normalizedStatus)) {
        return NextResponse.json({ success: false, error: '유효하지 않은 상태입니다.' }, { status: 400 });
      }
      fields.push('status = ?');
      params.push(normalizedStatus);
    }

    if (fields.length === 0) {
      return NextResponse.json({ success: false, error: '변경할 항목이 없습니다.' }, { status: 400 });
    }

    params.push(userId);

    await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    return NextResponse.json({ success: true, message: '사용자 정보가 업데이트되었습니다.' });
  } catch (error) {
    console.error('사용자 업데이트 실패:', error);
    return NextResponse.json({ success: false, error: '사용자 업데이트에 실패했습니다.' }, { status: 500 });
  }
}

// DELETE: 사용자 소프트 삭제 (관리자 전용)
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ success: false, error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    await pool.execute('UPDATE users SET status = ? WHERE id = ?', ['deleted', userId]);

    return NextResponse.json({ success: true, message: '사용자가 삭제 처리되었습니다.' });
  } catch (error) {
    console.error('사용자 삭제 처리 실패:', error);
    return NextResponse.json({ success: false, error: '사용자 삭제 처리에 실패했습니다.' }, { status: 500 });
  }
}
