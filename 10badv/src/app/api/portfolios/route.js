import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// GET: 포트폴리오 목록 조회
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const designerId = searchParams.get('designerId');
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, u.name as designer_name, u.username as designer_username
      FROM portfolios p
      LEFT JOIN users u ON p.designer_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (designerId) { conditions.push('p.designer_id = ?'); params.push(designerId); }
    if (status) { conditions.push('p.status = ?'); params.push(status); }
    if (category) { conditions.push('p.category = ?'); params.push(category); }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    // 데이터 + 총 개수 병렬 조회
    let countQuery = 'SELECT COUNT(*) as total FROM portfolios p';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }
    const countParams = [...params];

    const [[portfolios], [countResult]] = await Promise.all([
      pool.execute(query, params),
      pool.execute(countQuery, countParams)
    ]);

    const formattedPortfolios = portfolios.map(p => ({
      ...p,
      image_url: p.thumbnail_url
    }));

    const response = NextResponse.json({
      success: true,
      portfolios: formattedPortfolios,
      pagination: {
        page, limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    return response;
  } catch (error) {
    console.error('포트폴리오 조회 실패:', error);
    return NextResponse.json({ success: false, error: '포트폴리오 조회에 실패했습니다.' }, { status: 500 });
  }
}

// POST: 새 포트폴리오 생성
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'designer') {
      return NextResponse.json({ success: false, error: '디자이너만 포트폴리오를 생성할 수 있습니다.' }, { status: 403 });
    }

    const data = await request.json();
    const { title, description, category, price, thumbnail_url, images } = data;
    const parsedPrice = Number(price);

    if (!title || !description || !category || !Number.isInteger(parsedPrice)) {
      return NextResponse.json({ success: false, error: '필수 항목을 모두 입력해주세요.' }, { status: 400 });
    }

    if (parsedPrice < 1000 || parsedPrice % 1000 !== 0) {
      return NextResponse.json({ success: false, error: '가격은 최소 1,000원이며 1,000원 단위로 입력해야 합니다.' }, { status: 400 });
    }

    const [result] = await pool.execute(
      `INSERT INTO portfolios
       (designer_id, title, description, category, price, thumbnail_url, status, views, likes)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, 0)`,
      [session.user.id, title, description, category, parsedPrice, thumbnail_url || null]
    );

    const portfolioId = result.insertId;

    if (images && images.length > 0) {
      const placeholders = images.map((_, i) => '(?, ?, ?)').join(', ');
      const values = images.flatMap((url, i) => [portfolioId, url, i]);
      await pool.execute(
        `INSERT INTO portfolio_images (portfolio_id, image_url, display_order) VALUES ${placeholders}`,
        values
      );
    }

    return NextResponse.json({
      success: true,
      portfolioId,
      message: '포트폴리오가 성공적으로 등록되었습니다. 관리자 승인 후 공개됩니다.'
    });
  } catch (error) {
    console.error('포트폴리오 생성 실패:', error);
    return NextResponse.json({ success: false, error: '포트폴리오 생성에 실패했습니다.' }, { status: 500 });
  }
}
