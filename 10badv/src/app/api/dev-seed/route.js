import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import bcrypt from 'bcrypt';

// 샘플 데이터 시드 (관리자 전용, 개발 환경에서만)
export async function POST(request) {
  try {
    // 프로덕션 환경 차단
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: '프로덕션 환경에서는 사용할 수 없습니다.' }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const hashedPassword = await bcrypt.hash('test1234', 12);

    // 샘플 디자이너 5명
    for (let i = 1; i <= 5; i++) {
      const [rows] = await pool.execute('SELECT id FROM users WHERE username = ?', [`design${i}`]);
      if (rows.length === 0) {
        await pool.execute(
          'INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)',
          [`design${i}`, hashedPassword, `디자이너${i}`, `design${i}@test.com`, 'designer']
        );
      }
    }

    // 샘플 광고주 5명
    for (let i = 1; i <= 5; i++) {
      const [rows] = await pool.execute('SELECT id FROM users WHERE username = ?', [`test${i}`]);
      if (rows.length === 0) {
        await pool.execute(
          'INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)',
          [`test${i}`, hashedPassword, `광고주${i}`, `test${i}@test.com`, 'user']
        );
      }
    }

    // 샘플 포트폴리오
    const [designerRows] = await pool.execute("SELECT id, username FROM users WHERE role = 'designer' ORDER BY id ASC");
    let portfolioCount = 0;
    for (const designer of designerRows) {
      for (let j = 1; j <= 2; j++) {
        const title = `${designer.username}의 포트폴리오${j}`;
        const [exist] = await pool.execute('SELECT id FROM portfolios WHERE title = ?', [title]);
        if (exist.length === 0) {
          await pool.execute(
            'INSERT INTO portfolios (designer_id, title, description, category, price, status, views, likes) VALUES (?, ?, ?, ?, ?, ?, 0, 0)',
            [designer.id, title, `${title} 설명`, '디자인', 100000 * j, 'approved']
          );
          portfolioCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `시드 데이터 생성 완료 (포트폴리오 ${portfolioCount}개 추가)`,
    });
  } catch (error) {
    console.error('시드 데이터 생성 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
