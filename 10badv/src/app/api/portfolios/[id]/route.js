import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// GET: 단일 포트폴리오 조회
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const [portfolios] = await pool.execute(
      `SELECT p.*, u.name as designer_name, u.username as designer_username
       FROM portfolios p
       LEFT JOIN users u ON p.designer_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (portfolios.length === 0) {
      return NextResponse.json({ success: false, error: '포트폴리오를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 조회수 증가
    await pool.execute('UPDATE portfolios SET views = views + 1 WHERE id = ?', [id]);

    const [images] = await pool.execute(
      'SELECT * FROM portfolio_images WHERE portfolio_id = ? ORDER BY display_order',
      [id]
    );

    return NextResponse.json({
      success: true,
      portfolio: { ...portfolios[0], images }
    });
  } catch (error) {
    console.error('포트폴리오 조회 실패:', error);
    return NextResponse.json({ success: false, error: '포트폴리오 조회에 실패했습니다.' }, { status: 500 });
  }
}

// PATCH: 포트폴리오 수정
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();
    const { title, description, category, price, thumbnail_url, images, status } = data;

    const [portfolios] = await pool.execute(
      'SELECT designer_id FROM portfolios WHERE id = ?',
      [id]
    );

    if (portfolios.length === 0) {
      return NextResponse.json({ success: false, error: '포트폴리오를 찾을 수 없습니다.' }, { status: 404 });
    }

    const isOwner = portfolios[0].designer_id === parseInt(session.user.id);
    const isAdmin = session.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: '수정 권한이 없습니다.' }, { status: 403 });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (price !== undefined) { updates.push('price = ?'); values.push(price); }
    if (thumbnail_url !== undefined) { updates.push('thumbnail_url = ?'); values.push(thumbnail_url); }
    if (status !== undefined && isAdmin) { updates.push('status = ?'); values.push(status); }

    if (updates.length > 0) {
      values.push(id);
      await pool.execute(
        `UPDATE portfolios SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
        values
      );
    }

    if (images !== undefined && Array.isArray(images)) {
      await pool.execute('DELETE FROM portfolio_images WHERE portfolio_id = ?', [id]);
      for (let i = 0; i < images.length; i++) {
        await pool.execute(
          'INSERT INTO portfolio_images (portfolio_id, image_url, display_order) VALUES (?, ?, ?)',
          [id, images[i], i]
        );
      }
    }

    return NextResponse.json({ success: true, message: '포트폴리오가 수정되었습니다.' });
  } catch (error) {
    console.error('포트폴리오 수정 실패:', error);
    return NextResponse.json({ success: false, error: '포트폴리오 수정에 실패했습니다.' }, { status: 500 });
  }
}

// DELETE: 포트폴리오 삭제
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;

    const [portfolios] = await pool.execute(
      'SELECT designer_id FROM portfolios WHERE id = ?',
      [id]
    );

    if (portfolios.length === 0) {
      return NextResponse.json({ success: false, error: '포트폴리오를 찾을 수 없습니다.' }, { status: 404 });
    }

    const isOwner = portfolios[0].designer_id === parseInt(session.user.id);
    const isAdmin = session.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: '삭제 권한이 없습니다.' }, { status: 403 });
    }

    await pool.execute('DELETE FROM portfolio_images WHERE portfolio_id = ?', [id]);
    await pool.execute('DELETE FROM portfolios WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: '포트폴리오가 삭제되었습니다.' });
  } catch (error) {
    console.error('포트폴리오 삭제 실패:', error);
    return NextResponse.json({ success: false, error: '포트폴리오 삭제에 실패했습니다.' }, { status: 500 });
  }
}
