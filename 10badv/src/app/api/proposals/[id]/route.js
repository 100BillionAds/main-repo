import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import pool from '@/lib/db';
import { decideProposal } from '@/domain/escrow/escrowService';
import { errorResponse } from '@/lib/apiResponse';

// PATCH: 제안 상태 변경 (수락/거절). 수락 시 제안 금액이 에스크로로 보관된다.
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await request.json();

    const { proposalId, transactionId } = await decideProposal({
      proposalId: id,
      clientId: session.user.id,
      decision: status,
    });

    const [updatedRows] = await pool.execute(
      `SELECT p.*, u.username as designer_username, u.name as designer_name
       FROM proposals p
       LEFT JOIN users u ON p.designer_id = u.id
       WHERE p.id = ?`,
      [proposalId]
    );

    return NextResponse.json({ success: true, proposal: updatedRows[0], transactionId });
  } catch (error) {
    return errorResponse(error, '제안 처리에 실패했습니다.', '제안 상태 변경 오류');
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
