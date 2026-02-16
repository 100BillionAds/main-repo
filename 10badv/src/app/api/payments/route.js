import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// POST: 결제 준비 (결제 정보 생성)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { amount, payment_method = 'card', order_name, portfolio_id } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: '유효하지 않은 금액입니다.' }, { status: 400 });
    }

    // 고유 주문 ID 생성
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const merchant_uid = `order_${session.user.id}_${timestamp}_${randomStr}`;

    const [result] = await pool.execute(
      `INSERT INTO payments
       (user_id, merchant_uid, amount, payment_method, order_name, portfolio_id, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [session.user.id, merchant_uid, amount, payment_method, order_name || `포인트 ${amount.toLocaleString()}원 충전`, portfolio_id || null]
    );

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
    return NextResponse.json({ success: false, error: '결제 준비에 실패했습니다.' }, { status: 500 });
  }
}

// GET: 결제 내역 조회
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM payments WHERE user_id = ?';
    const params = [session.user.id];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [payments] = await pool.execute(query, params);

    return NextResponse.json({ success: true, payments });
  } catch (error) {
    console.error('결제 내역 조회 실패:', error);
    return NextResponse.json({ success: false, error: '결제 내역 조회에 실패했습니다.' }, { status: 500 });
  }
}
