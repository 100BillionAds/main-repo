import { query } from '@/lib/db';
import { getAutoCancelDays } from '@/domain/escrow/policy';
import { Trade } from '@/domain/escrow/Trade';

/**
 * 거래 저장소 (Repository)
 *
 * 저장소란: 엔티티를 "꺼내고 넣는" 창구. 도메인 코드가 SQL 을 몰라도 되게 한다.
 * transactions 테이블을 읽고 쓰는 SQL 은 (조회 전용 API 를 빼면) 이 파일에만 있다.
 *
 * 쓰기 함수는 모두 호출자의 트랜잭션(connection) 안에서 실행된다.
 */

// 엔티티 필드 → 컬럼. 여기 없는 필드는 저장되지 않는다 (임의의 컬럼명이 SQL 에 들어가지 않게 하는 허용 목록).
const COLUMNS = Object.freeze({
  status: 'status',
  escrowStatus: 'escrow_status',
  paymentStatus: 'payment_status',
  commission: 'commission',
  settledBy: 'settled_by',
  cancelReason: 'cancel_reason',
  startedAt: 'started_at',
  submittedAt: 'submitted_at',
  completedAt: 'completed_at',
  cancelledAt: 'cancelled_at',
  autoConfirmAt: 'auto_confirm_at',
  autoCancelAt: 'auto_cancel_at',
});

function clampLimit(limit) {
  return Math.max(1, Math.min(500, Math.floor(Number(limit)) || 100));
}

/**
 * 거래 행을 잠그고(FOR UPDATE) 엔티티로 돌려준다. 없으면 null.
 * 상태를 보고 판단하는 코드는 반드시 이 함수로 읽어야 한다 — 잠그지 않고 읽으면
 * 두 요청이 같은 상태를 보고 둘 다 정산할 수 있다.
 */
export async function findByIdForUpdate(connection, tradeId) {
  const [rows] = await connection.execute(
    `SELECT t.*,
            (t.auto_confirm_at IS NOT NULL AND t.auto_confirm_at <= NOW()) AS confirm_due,
            (t.auto_cancel_at IS NOT NULL AND t.auto_cancel_at <= NOW()) AS cancel_due
       FROM transactions t
      WHERE t.id = ?
        FOR UPDATE`,
    [tradeId]
  );
  return rows[0] ? Trade.fromRow(rows[0]) : null;
}

/** 에스크로 보관 상태의 새 거래를 만든다. 자동 취소 기한이 함께 걸린다. */
export async function insertHeld(connection, { portfolioId, proposalId, buyerId, designerId, amount }) {
  const [result] = await connection.execute(
    `INSERT INTO transactions
       (portfolio_id, proposal_id, buyer_id, designer_id, amount,
        status, payment_method, payment_status, escrow_status, auto_cancel_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 'points', 'completed', 'held', DATE_ADD(NOW(), INTERVAL ? DAY))`,
    [portfolioId ?? null, proposalId ?? null, buyerId, designerId, amount, getAutoCancelDays()]
  );
  return result.insertId;
}

/** 엔티티에 쌓인 변경분만 UPDATE 한다. 변경이 없으면 아무것도 하지 않는다. */
export async function save(connection, trade) {
  const changes = trade.pullChanges();
  const assignments = [];
  const params = [];

  for (const [field, value] of Object.entries(changes)) {
    const column = COLUMNS[field];
    if (!column) {
      throw new Error(`저장할 수 없는 거래 필드입니다: ${field}`);
    }
    if (value?.kind === 'now') {
      assignments.push(`${column} = NOW()`);
    } else if (value?.kind === 'daysFromNow') {
      assignments.push(`${column} = DATE_ADD(NOW(), INTERVAL ? DAY)`);
      params.push(value.days);
    } else {
      assignments.push(`${column} = ?`);
      params.push(value);
    }
  }

  if (assignments.length === 0) return;

  await connection.execute(`UPDATE transactions SET ${assignments.join(', ')} WHERE id = ?`, [...params, trade.id]);
}

/** 자동 구매확정 후보의 id (기한이 오래 지난 순). 실제 대상 여부는 잠근 뒤 엔티티가 다시 판단한다. */
export async function findAutoConfirmCandidateIds(limit) {
  const rows = await query(
    `SELECT id FROM transactions
      WHERE status = 'awaiting_confirmation' AND escrow_status = 'held'
        AND auto_confirm_at IS NOT NULL AND auto_confirm_at <= NOW()
      ORDER BY auto_confirm_at ASC
      LIMIT ${clampLimit(limit)}`
  );
  return rows.map((row) => row.id);
}

/** 자동 취소 후보의 id (기한이 오래 지난 순). */
export async function findAutoCancelCandidateIds(limit) {
  const rows = await query(
    `SELECT id FROM transactions
      WHERE status = 'pending' AND escrow_status = 'held'
        AND auto_cancel_at IS NOT NULL AND auto_cancel_at <= NOW()
      ORDER BY auto_cancel_at ASC
      LIMIT ${clampLimit(limit)}`
  );
  return rows.map((row) => row.id);
}
