import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// POST: 오류 신고 생성
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { title, category, description, page_url } = await request.json();

    if (!title || !description || !category) {
      return NextResponse.json({ success: false, error: '제목, 카테고리, 설명은 필수입니다.' }, { status: 400 });
    }

    if (title.length > 200) {
      return NextResponse.json({ success: false, error: '제목은 200자 이내로 입력해주세요.' }, { status: 400 });
    }

    const [result] = await pool.execute(
      'INSERT INTO bug_reports (user_id, title, category, description, page_url, status, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [session.user.id, title, category, description, page_url || null, 'open']
    );

    return NextResponse.json({ success: true, reportId: result.insertId, message: '오류가 신고되었습니다. 빠르게 확인하겠습니다.' }, { status: 201 });
  } catch (error) {
    console.error('오류 신고 실패:', error);
    return NextResponse.json({ success: false, error: '오류 신고에 실패했습니다.' }, { status: 500 });
  }
}

// GET: 오류 신고 목록 조회
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 10, 50);
    const offset = (page - 1) * limit;

    let query, countQuery, params, countParams;

    if (session.user.role === 'admin') {
      // 관리자: 전체 조회
      query = `SELECT br.*, u.username FROM bug_reports br LEFT JOIN users u ON br.user_id = u.id ORDER BY br.created_at DESC LIMIT ? OFFSET ?`;
      countQuery = 'SELECT COUNT(*) as total FROM bug_reports';
      params = [limit, offset];
      countParams = [];
    } else {
      // 일반 사용자: 자기 것만
      query = `SELECT br.*, u.username FROM bug_reports br LEFT JOIN users u ON br.user_id = u.id WHERE br.user_id = ? ORDER BY br.created_at DESC LIMIT ? OFFSET ?`;
      countQuery = 'SELECT COUNT(*) as total FROM bug_reports WHERE user_id = ?';
      params = [session.user.id, limit, offset];
      countParams = [session.user.id];
    }

    const [reports] = await pool.execute(query, params);
    const [countResult] = await pool.execute(countQuery, countParams);

    return NextResponse.json({
      success: true,
      reports,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit),
      },
    });
  } catch (error) {
    console.error('오류 신고 조회 실패:', error);
    return NextResponse.json({ success: false, error: '오류 신고 조회에 실패했습니다.' }, { status: 500 });
  }
}
