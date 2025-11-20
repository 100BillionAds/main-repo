import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { getServerSession } from 'next-auth';

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'merk',
  database: '10badv'
};

// PATCH: 제안 상태 변경 (수락/거절)
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await request.json();
    const { status } = body; // ACCEPTED or REJECTED
    
    if (!status || !['ACCEPTED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: '올바른 상태값이 아닙니다.' }, { status: 400 });
    }
    
    const connection = await mysql.createConnection(dbConfig);
    
    // 제안 정보 조회
    const [proposalRows] = await connection.execute(
      `SELECT p.*, r.client_id, r.status as request_status 
       FROM proposals p
       JOIN requests r ON p.request_id = r.id
       WHERE p.id = ?`,
      [id]
    );
    
    if (proposalRows.length === 0) {
      await connection.end();
      return NextResponse.json({ error: '제안을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    const proposal = proposalRows[0];
    
    // 의뢰 작성자만 제안을 수락/거절할 수 있음
    if (proposal.client_id !== session.user.id) {
      await connection.end();
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }
    
    // 의뢰가 OPEN 상태가 아니면 수락/거절 불가
    if (proposal.request_status !== 'OPEN') {
      await connection.end();
      return NextResponse.json({ error: '이미 마감된 의뢰입니다.' }, { status: 400 });
    }
    
    await connection.beginTransaction();
    
    try {
      // 제안 상태 업데이트
      await connection.execute(
        'UPDATE proposals SET status = ? WHERE id = ?',
        [status, id]
      );
      
      // 제안이 수락되면
      if (status === 'ACCEPTED') {
        // 의뢰 상태를 MATCHED로 변경
        await connection.execute(
          'UPDATE requests SET status = ? WHERE id = ?',
          ['MATCHED', proposal.request_id]
        );
        
        // 해당 의뢰의 다른 제안들은 자동으로 REJECTED 처리
        await connection.execute(
          'UPDATE proposals SET status = ? WHERE request_id = ? AND id != ?',
          ['REJECTED', proposal.request_id, id]
        );
        
        // 거래(Transaction) 생성
        await connection.execute(
          `INSERT INTO transactions 
           (buyer_id, seller_id, amount, status, description, proposal_id) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            proposal.client_id, // buyer (의뢰자)
            proposal.designer_id, // seller (디자이너)
            proposal.offer_price,
            'pending',
            `의뢰 제안 수락 (Proposal #${id})`,
            id
          ]
        );
      }
      
      await connection.commit();
      
      // 업데이트된 제안 조회
      const [updatedRows] = await connection.execute(
        `SELECT 
          p.*,
          u.username as designer_username,
          u.name as designer_name
        FROM proposals p
        LEFT JOIN users u ON p.designer_id = u.id
        WHERE p.id = ?`,
        [id]
      );
      
      await connection.end();
      
      return NextResponse.json(updatedRows[0]);
    } catch (error) {
      await connection.rollback();
      await connection.end();
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
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    
    const { id } = await params;
    const connection = await mysql.createConnection(dbConfig);
    
    // 제안 정보 조회
    const [rows] = await connection.execute(
      'SELECT designer_id FROM proposals WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      await connection.end();
      return NextResponse.json({ error: '제안을 찾을 수 없습니다.' }, { status: 404 });
    }
    
    // 제안 작성자만 삭제 가능
    if (rows[0].designer_id !== session.user.id) {
      await connection.end();
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 });
    }
    
    await connection.execute('DELETE FROM proposals WHERE id = ?', [id]);
    await connection.end();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('제안 삭제 오류:', error);
    return NextResponse.json({ error: '제안 삭제에 실패했습니다.' }, { status: 500 });
  }
}
