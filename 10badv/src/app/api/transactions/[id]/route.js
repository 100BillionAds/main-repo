import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import mysql from 'mysql2/promise';

// MySQL 연결 설정
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || 'merk',
  database: process.env.DATABASE_NAME || '10badv'
};

// GET: 단일 거래 조회
export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const connection = await mysql.createConnection(dbConfig);

    const [transactions] = await connection.execute(
      `SELECT 
        t.*,
        p.title as portfolio_title,
        d.name as designer_name,
        d.username as designer_username,
        b.name as buyer_name,
        b.username as buyer_username
      FROM transactions t
      LEFT JOIN portfolios p ON t.portfolio_id = p.id
      LEFT JOIN users d ON t.designer_id = d.id
      LEFT JOIN users b ON t.buyer_id = b.id
      WHERE t.id = ?`,
      [id]
    );

    await connection.end();

    if (transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: '거래를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const transaction = transactions[0];

    // 본인 거래가 아니면 권한 없음 (타입 변환하여 비교)
    const userId = parseInt(session.user.id);
    if (
      transaction.designer_id !== userId &&
      transaction.buyer_id !== userId &&
      session.user.role !== 'admin'
    ) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      transaction,
    });
  } catch (error) {
    console.error('거래 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH: 거래 상태 업데이트
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const { status } = await request.json();
    
    if (!status) {
      return NextResponse.json(
        { success: false, error: '상태 값이 필요합니다.' },
        { status: 400 }
      );
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    // 거래 정보 조회
    const [transactions] = await connection.execute(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
    
    if (transactions.length === 0) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '거래를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    const transaction = transactions[0];
    const userId = parseInt(session.user.id);
    
    // 권한 확인
    const isBuyer = transaction.buyer_id === userId;
    const isDesigner = transaction.designer_id === userId;
    const isAdmin = session.user.role === 'admin';
    
    if (!isBuyer && !isDesigner && !isAdmin) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      );
    }
    
    // 상태 전환 로직 검증
    const validTransitions = {
      'pending': ['in_progress', 'cancelled'],
      'in_progress': ['awaiting_confirmation', 'cancelled'],
      'awaiting_confirmation': ['completed', 'in_progress'],
      'completed': [],
      'cancelled': []
    };
    
    if (!validTransitions[transaction.status]?.includes(status)) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '유효하지 않은 상태 전환입니다.' },
        { status: 400 }
      );
    }
    
    // 역할별 권한 검증 (프롬프트 요구사항)
    // pending → in_progress: 디자이너만 가능
    if (status === 'in_progress' && transaction.status === 'pending' && !isDesigner && !isAdmin) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '디자이너만 거래를 진행 중으로 변경할 수 있습니다.' },
        { status: 403 }
      );
    }
    
    // in_progress → awaiting_confirmation: 디자이너만 가능
    if (status === 'awaiting_confirmation' && !isDesigner && !isAdmin) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '디자이너만 작업 완료를 할 수 있습니다.' },
        { status: 403 }
      );
    }
    
    // awaiting_confirmation → completed: 광고주만 가능
    if (status === 'completed' && transaction.status === 'awaiting_confirmation' && !isBuyer && !isAdmin) {
      await connection.end();
      return NextResponse.json(
        { success: false, error: '광고주만 거래 완료 승인을 할 수 있습니다.' },
        { status: 403 }
      );
    }
    
    // 상태 업데이트
    await connection.execute(
      'UPDATE transactions SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
    
    // completed 상태로 변경 시 포인트 정산
    if (status === 'completed' && transaction.status !== 'completed') {
      // 디자이너에게 포인트 지급 (amount 컬럼 사용)
      await connection.execute(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [transaction.amount, transaction.designer_id]
      );
      
      // 포인트 내역 기록
      await connection.execute(
        `INSERT INTO point_transactions (user_id, amount, type, description, created_at) 
         VALUES (?, ?, 'earn', ?, NOW())`,
        [transaction.designer_id, transaction.amount, `거래 #${id} 완료 대금 지급`]
      );
    }
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      message: '거래 상태가 업데이트되었습니다.'
    });
  } catch (error) {
    console.error('거래 업데이트 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
