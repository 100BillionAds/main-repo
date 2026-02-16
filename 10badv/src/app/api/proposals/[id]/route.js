import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';

// PATCH: 제안 상태 변경 (수락/거절)
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['ACCEPTED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: '올바른 상태값이 아닙니다.' }, { status: 400 });
    }

    // 제안 정보 조회
    const [proposalRows] = await pool.execute(
      `SELECT p.*, r.client_id, r.status as request_status
       FROM proposals p
       JOIN requests r ON p.request_id = r.id
       WHERE p.id = ?`,
      [id]
    );

    if (proposalRows.length === 0) {
      return NextResponse.json({ error: '제안을 찾을 수 없습니다.' }, { status: 404 });
    }

    const proposal = proposalRows[0];
    const userId = parseInt(session.user.id);

    // 의뢰 작성자만 제안을 수락/거절할 수 있음
    if (proposal.client_id !== userId) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    if (proposal.request_status !== 'OPEN') {
      return NextResponse.json({ error: '이미 마감된 의뢰입니다.' }, { status: 400 });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // 제안 상태 업데이트
      await connection.execute(
        'UPDATE proposals SET status = ? WHERE id = ?',
        [status, id]
      );

      if (status === 'ACCEPTED') {
        // 의뢰 상태를 MATCHED로 변경
        await connection.execute(
          'UPDATE requests SET status = ? WHERE id = ?',
          ['MATCHED', proposal.request_id]
        );

        // 해당 의뢰의 다른 제안들은 자동 REJECTED
        await connection.execute(
          'UPDATE proposals SET status = ? WHERE request_id = ? AND id != ?',
          ['REJECTED', proposal.request_id, id]
        );

        // 거래(Transaction) 생성
        await connection.execute(
          `INSERT INTO transactions
           (buyer_id, designer_id, amount, status, proposal_id)
           VALUES (?, ?, ?, ?, ?)`,
          [
            proposal.client_id,
            proposal.designer_id,
            proposal.offer_price,
            'pending',
            id
          ]
        );
      }

      await connection.commit();

      // 업데이트된 제안 조회
      const [updatedRows] = await connection.execute(
        `SELECT p.*, u.username as designer_username, u.name as designer_name
         FROM proposals p
         LEFT JOIN users u ON p.designer_id = u.id
         WHERE p.id = ?`,
        [id]
      );

      connection.release();
      return NextResponse.json({ success: true, proposal: updatedRows[0] });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('제안 상태 변경 오류:', error);
    return NextResponse.json({ error: '제안 처리에 실패했습니다.' }, { status: 500 });
  }
}

// DELETE: 제안 삭제
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;

    const [rows] = await pool.execute(
      'SELECT designer_id, status FROM proposals WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: '제안을 찾을 수 없습니다.' }, { status: 404 });
    }

    const userId = parseInt(session.user.id);
    if (rows[0].designer_id !== userId) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    if (rows[0].status === 'ACCEPTED') {
      return NextResponse.json({ error: '수락된 제안은 삭제할 수 없습니다.' }, { status: 400 });
    }

    await pool.execute('DELETE FROM proposals WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: '제안이 삭제되었습니다.' });
  } catch (error) {
    console.error('제안 삭제 오류:', error);
    return NextResponse.json({ error: '제안 삭제에 실패했습니다.' }, { status: 500 });
  }
}
