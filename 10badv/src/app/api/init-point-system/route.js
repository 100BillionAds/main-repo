import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// 포인트 시스템 초기화 (관리자 전용, 개발 환경에서만)
export async function POST() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: false, error: '프로덕션 환경에서는 사용할 수 없습니다.' }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    // users 테이블에 points 컬럼 추가 (이미 있으면 무시)
    try {
      await pool.execute('ALTER TABLE users ADD COLUMN points INT DEFAULT 0 AFTER role');
    } catch (err) {
      if (!err.message.includes('Duplicate column name')) {
        throw err;
      }
    }

    // point_transactions 테이블 생성
    await pool.execute(`
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

    return NextResponse.json({
      success: true,
      message: '포인트 시스템 초기화 완료 (테이블 생성/확인)',
    });
  } catch (error) {
    console.error('포인트 시스템 초기화 실패:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
