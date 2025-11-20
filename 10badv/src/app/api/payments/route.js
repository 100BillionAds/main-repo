import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import mysql from 'mysql2/promise';

// MySQL 연결 설정
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || 'merk',
  database: process.env.DATABASE_NAME || '10badv',
};

// POST: 결제 준비 (결제 정보 생성)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const { amount, payment_method = 'card', order_name } = await request.json();
    
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 금액입니다.' },
        { status: 400 }
      );
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    // 고유한 주문 ID 생성 (merchant_uid)
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const merchant_uid = `order_${session.user.id}_${timestamp}_${randomStr}`;
    
    // 결제 정보 DB에 저장 (pending 상태)
    const [result] = await connection.execute(
      `INSERT INTO payments 
       (user_id, merchant_uid, amount, payment_method, order_name, status, created_at) 
       VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
      [session.user.id, merchant_uid, amount, payment_method, order_name || `포인트 ${amount.toLocaleString()}원 충전`]
    );
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      merchant_uid,
      payment_id: result.insertId,
      amount,
      order_name: order_name || `포인트 ${amount.toLocaleString()}원 충전`,
      buyer_name: session.user.name,
      buyer_email: session.user.email
    });
  } catch (error) {
    console.error('결제 준비 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET: 결제 내역 조회
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, completed, failed, cancelled
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const connection = await mysql.createConnection(dbConfig);
    
    let query = `
      SELECT * FROM payments 
      WHERE user_id = ?
    `;
    const params = [session.user.id];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ' + limit + ' OFFSET ' + offset;
    
    const [payments] = await connection.execute(query, params);
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error('결제 내역 조회 실패:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
