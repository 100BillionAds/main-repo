import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'merk',
  database: '10badv',
};

// 포인트 시스템 초기화 (테이블 추가/수정)
export async function POST() {
  const connection = await mysql.createConnection(dbConfig);
  try {
    // 1. users 테이블에 points 컬럼 추가 (이미 있으면 무시)
    try {
      await connection.execute(
        'ALTER TABLE users ADD COLUMN points INT DEFAULT 0 AFTER role'
      );
    } catch (err) {
      // 컬럼이 이미 존재하면 에러 무시
      if (!err.message.includes('Duplicate column name')) {
        throw err;
      }
    }

    // 2. point_transactions 테이블 생성 (포인트 충전/사용/인출 내역)
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS point_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('charge', 'use', 'withdraw', 'refund') NOT NULL,
        amount INT NOT NULL,
        fee INT DEFAULT 0,
        balance_after INT NOT NULL,
        description VARCHAR(500),
        reference_type VARCHAR(50),
        reference_id INT,
        status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_created (user_id, created_at),
        INDEX idx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. 기존 users에게 초기 포인트 지급 (테스트용)
    await connection.execute(
      'UPDATE users SET points = 1000000 WHERE points = 0 OR points IS NULL'
    );

    await connection.end();
    return NextResponse.json({
      success: true,
      message: '포인트 시스템 초기화 완료 (users.points 컬럼 추가, point_transactions 테이블 생성, 기존 회원 100만 포인트 지급)',
    });
  } catch (error) {
    await connection.end();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
