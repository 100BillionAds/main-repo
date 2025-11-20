import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'merk',
  database: '10badv',
};

// 샘플 유저/포트폴리오/거래 데이터 삽입 API (개발용)
export async function POST() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    // 1. 샘플 유저 생성 (디자이너 5명, 광고주 5명)
    const designers = [];
    const advertisers = [];
    for (let i = 1; i <= 5; i++) {
      designers.push({
        username: `design${i}`,
        password: '1234',
        name: `디자이너${i}`,
        email: `design${i}@test.com`,
        role: 'designer',
      });
      advertisers.push({
        username: `test${i}`,
        password: '1234',
        name: `광고주${i}`,
        email: `test${i}@test.com`,
        role: 'user',
      });
    }
    // 중복 방지: 이미 있으면 건너뜀
    for (const user of [...designers, ...advertisers]) {
      const [rows] = await connection.execute('SELECT id FROM users WHERE username = ?', [user.username]);
      if (rows.length === 0) {
        await connection.execute(
          'INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)',
          [user.username, user.password, user.name, user.email, user.role]
        );
      }
    }
    // 2. 샘플 포트폴리오 생성 (디자이너별 2개씩)
    const [designerRows] = await connection.execute('SELECT id, username FROM users WHERE role = ? ORDER BY id ASC', ['designer']);
    let portfolioCount = 0;
    for (const designer of designerRows) {
      for (let j = 1; j <= 2; j++) {
        const title = `${designer.username}의 포트폴리오${j}`;
        const [exist] = await connection.execute('SELECT id FROM portfolios WHERE title = ?', [title]);
        if (exist.length === 0) {
          await connection.execute(
            'INSERT INTO portfolios (designer_id, title, description, category, price, status, views, likes) VALUES (?, ?, ?, ?, ?, ?, 0, 0)',
            [designer.id, title, `${title} 설명`, '디자인', 100000 * j, 'approved']
          );
          portfolioCount++;
        }
      }
    }
    // 3. 샘플 거래 생성 (광고주별로 포트폴리오 1개씩 구매)
    const [portfolioRows] = await connection.execute('SELECT id, designer_id FROM portfolios ORDER BY id ASC');
    const [advertiserRows] = await connection.execute('SELECT id, username FROM users WHERE role = ? ORDER BY id ASC', ['user']);
    let transactionCount = 0;
    for (let i = 0; i < advertiserRows.length; i++) {
      const buyer = advertiserRows[i];
      const portfolio = portfolioRows[i % portfolioRows.length];
      // 중복 방지
      const [exist] = await connection.execute('SELECT id FROM transactions WHERE buyer_id = ? AND portfolio_id = ?', [buyer.id, portfolio.id]);
      if (exist.length === 0) {
        await connection.execute(
          'INSERT INTO transactions (portfolio_id, buyer_id, designer_id, amount, status, payment_method, payment_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [portfolio.id, buyer.id, portfolio.designer_id, 100000, 'completed', 'card', 'completed']
        );
        transactionCount++;
      }
    }
    await connection.end();
    return NextResponse.json({
      success: true,
      message: `샘플 유저 ${designers.length + advertisers.length}명, 포트폴리오 ${portfolioCount}개, 거래 ${transactionCount}건 생성 완료`,
    });
  } catch (error) {
    await connection.end();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
