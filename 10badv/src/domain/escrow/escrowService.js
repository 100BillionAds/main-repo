import { query, withTransaction } from '@/lib/db';
import { DomainError } from '@/domain/errors';
import { creditPoints, debitPoints } from '@/domain/points/ledger';
import {
  ESCROW_STATUS,
  TRANSACTION_STATUS,
  calculateSettlement,
  getAutoCancelDays,
  getAutoConfirmDays,
  getTransitionDenial,
} from '@/domain/escrow/policy';

/**
 * 에스크로 서비스
 *
 * 거래(transactions) 한 건이 애그리거트이고, 돈이 움직이는 모든 흐름이 여기를 지난다.
 *
 *   보관(hold)   : 구매/제안 수락 시 구매자 포인트를 차감해 거래에 묶는다.
 *   정산(release): 구매확정(수동/자동) 시 수수료를 떼고 디자이너에게 지급한다.
 *   환불(refund) : 취소(수동/자동) 시 구매자에게 전액 돌려준다.
 *
 * 동시성 규칙
 *   1. 상태를 읽고 판단하는 코드는 반드시 거래 행을 FOR UPDATE 로 잠근 뒤에 실행한다.
 *   2. 잠금 순서는 항상 (의뢰 →) 거래 → 사용자. 순서를 지켜 교착을 피한다.
 *   3. 정산/환불은 escrow_status = 'held' 일 때만 일어난다. 한 번 빠져나간 돈은 다시 나가지 않는다.
 */

const S = TRANSACTION_STATUS;
const E = ESCROW_STATUS;

function toId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function lockTransaction(connection, transactionId) {
  const [rows] = await connection.execute(
    `SELECT t.*,
            (t.auto_confirm_at IS NOT NULL AND t.auto_confirm_at <= NOW()) AS confirm_due,
            (t.auto_cancel_at IS NOT NULL AND t.auto_cancel_at <= NOW()) AS cancel_due
       FROM transactions t
      WHERE t.id = ?
        FOR UPDATE`,
    [transactionId]
  );
  return rows[0] || null;
}

async function insertHeldTransaction(connection, { portfolioId, proposalId, buyerId, designerId, amount }) {
  const [result] = await connection.execute(
    `INSERT INTO transactions
       (portfolio_id, proposal_id, buyer_id, designer_id, amount,
        status, payment_method, payment_status, escrow_status, auto_cancel_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 'points', 'completed', 'held', DATE_ADD(NOW(), INTERVAL ? DAY))`,
    [portfolioId ?? null, proposalId ?? null, buyerId, designerId, amount, getAutoCancelDays()]
  );
  return result.insertId;
}

/** 정산: 보관금에서 수수료를 떼고 디자이너에게 지급하고 거래를 완료 처리한다. */
async function releaseEscrow(connection, transaction, settledBy) {
  if (transaction.escrow_status !== E.HELD) {
    throw new DomainError('보관 중인 에스크로 금액이 없어 정산할 수 없습니다.', {
      status: 409,
      code: 'ESCROW_NOT_HELD',
    });
  }

  const amount = Number(transaction.amount);
  const { commission, payout } = calculateSettlement(amount);

  await connection.execute(
    `UPDATE transactions
        SET status = 'completed', escrow_status = 'released', commission = ?, settled_by = ?,
            completed_at = NOW(), auto_confirm_at = NULL, auto_cancel_at = NULL
      WHERE id = ?`,
    [commission, settledBy, transaction.id]
  );

  if (payout > 0) {
    const label = settledBy === 'auto' ? '자동 구매확정' : '완료';
    await creditPoints(connection, {
      userId: transaction.designer_id,
      type: 'earn',
      amount: payout,
      description: `거래 #${transaction.id} ${label} 대금 지급 (수수료 ${commission.toLocaleString()}원 차감)`,
      referenceType: 'transaction',
      referenceId: transaction.id,
    });
  }

  return { commission, payout };
}

/** 환불: 보관금이 있으면 구매자에게 전액 돌려주고 거래를 취소 처리한다. */
async function refundEscrow(connection, transaction, { cancelledBy, reason }) {
  const held = transaction.escrow_status === E.HELD;

  await connection.execute(
    `UPDATE transactions
        SET status = 'cancelled', settled_by = ?, cancel_reason = ?, cancelled_at = NOW(),
            auto_confirm_at = NULL, auto_cancel_at = NULL,
            escrow_status = ?, payment_status = ?
      WHERE id = ?`,
    [
      cancelledBy,
      reason || null,
      held ? E.REFUNDED : transaction.escrow_status,
      held ? 'refunded' : transaction.payment_status,
      transaction.id,
    ]
  );

  if (!held) {
    return { refunded: 0 };
  }

  const amount = Number(transaction.amount);
  await creditPoints(connection, {
    userId: transaction.buyer_id,
    type: 'refund',
    amount,
    description: `거래 #${transaction.id} 취소 환불${reason ? ` (${reason})` : ''}`,
    referenceType: 'transaction',
    referenceId: transaction.id,
  });

  return { refunded: amount };
}

/**
 * 포트폴리오 구매: 구매자 포인트를 에스크로로 보관하고 거래를 만든다.
 * @returns {Promise<{ transactionId: number, points: number }>}
 */
export async function purchasePortfolio({ buyerId, portfolioId, requestedAmount }) {
  const buyer = toId(buyerId);
  const portfolio = toId(portfolioId);
  if (!buyer || !portfolio) {
    throw new DomainError('필수 정보가 누락되었습니다.');
  }

  return withTransaction(async (connection) => {
    const [portfolios] = await connection.execute(
      "SELECT id, designer_id, title, price FROM portfolios WHERE id = ? AND status = 'approved'",
      [portfolio]
    );

    if (portfolios.length === 0) {
      throw new DomainError('포트폴리오를 찾을 수 없거나 승인되지 않았습니다.', { status: 404 });
    }

    const item = portfolios[0];
    const price = Number(item.price || 0);

    if (!Number.isSafeInteger(price) || price < 1000 || price % 1000 !== 0) {
      throw new DomainError('포트폴리오 가격이 유효하지 않습니다.');
    }

    const requested = Number(requestedAmount);
    if (Number.isFinite(requested) && requested > 0 && requested !== price) {
      throw new DomainError('포트폴리오 가격과 결제 금액이 일치하지 않습니다.');
    }

    if (Number(item.designer_id) === buyer) {
      throw new DomainError('자신의 포트폴리오는 구매할 수 없습니다.');
    }

    const transactionId = await insertHeldTransaction(connection, {
      portfolioId: item.id,
      buyerId: buyer,
      designerId: item.designer_id,
      amount: price,
    });

    const points = await debitPoints(connection, {
      userId: buyer,
      type: 'use',
      amount: price,
      description: `포트폴리오 구매 (에스크로): ${item.title}`,
      referenceType: 'transaction',
      referenceId: transactionId,
    });

    return { transactionId, points };
  });
}

/**
 * 제안 수락/거절. 수락 시 제안 금액을 에스크로로 보관하고 거래를 만든다.
 * @returns {Promise<{ proposalId: number, transactionId: number|null }>}
 */
export async function decideProposal({ proposalId, clientId, decision }) {
  const id = toId(proposalId);
  const client = toId(clientId);
  if (!id || !client) {
    throw new DomainError('제안을 찾을 수 없습니다.', { status: 404 });
  }
  if (!['ACCEPTED', 'REJECTED'].includes(decision)) {
    throw new DomainError('올바른 상태값이 아닙니다.');
  }

  return withTransaction(async (connection) => {
    const [refs] = await connection.execute('SELECT request_id FROM proposals WHERE id = ?', [id]);
    if (refs.length === 0) {
      throw new DomainError('제안을 찾을 수 없습니다.', { status: 404 });
    }

    // 같은 의뢰에 대한 동시 수락을 직렬화하기 위해 의뢰 행부터 잠근다.
    const [requests] = await connection.execute(
      'SELECT id, client_id, status, title FROM requests WHERE id = ? FOR UPDATE',
      [refs[0].request_id]
    );
    const [proposals] = await connection.execute('SELECT * FROM proposals WHERE id = ? FOR UPDATE', [id]);

    if (requests.length === 0 || proposals.length === 0) {
      throw new DomainError('제안을 찾을 수 없습니다.', { status: 404 });
    }

    const request = requests[0];
    const proposal = proposals[0];

    if (Number(request.client_id) !== client) {
      throw new DomainError('권한이 없습니다.', { status: 403 });
    }
    if (request.status !== 'OPEN') {
      throw new DomainError('이미 마감된 의뢰입니다.');
    }
    if (proposal.status !== 'PENDING') {
      throw new DomainError('이미 처리된 제안입니다.');
    }

    if (decision === 'REJECTED') {
      await connection.execute("UPDATE proposals SET status = 'REJECTED' WHERE id = ?", [id]);
      return { proposalId: id, transactionId: null };
    }

    const amount = Number(proposal.offer_price);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new DomainError('제안 금액이 유효하지 않습니다.');
    }
    if (Number(proposal.designer_id) === client) {
      throw new DomainError('자신의 제안은 수락할 수 없습니다.');
    }

    await connection.execute("UPDATE proposals SET status = 'ACCEPTED' WHERE id = ?", [id]);
    await connection.execute("UPDATE requests SET status = 'MATCHED' WHERE id = ?", [request.id]);
    await connection.execute(
      "UPDATE proposals SET status = 'REJECTED' WHERE request_id = ? AND id != ?",
      [request.id, id]
    );

    const transactionId = await insertHeldTransaction(connection, {
      proposalId: id,
      buyerId: client,
      designerId: proposal.designer_id,
      amount,
    });

    // 잔액이 부족하면 여기서 예외가 나고 위의 변경이 모두 롤백된다.
    await debitPoints(connection, {
      userId: client,
      type: 'use',
      amount,
      description: `의뢰 제안 수락 (에스크로): ${request.title}`,
      referenceType: 'transaction',
      referenceId: transactionId,
    });

    return { proposalId: id, transactionId };
  });
}

/**
 * 거래 상태 변경 (작업 시작 / 작업 완료 제출 / 수정 요청 / 구매확정 / 취소)
 * @param {{ transactionId: number|string, actor: { id: number|string, role: string }, status: string }} input
 */
export async function changeTransactionStatus({ transactionId, actor, status }) {
  const id = toId(transactionId);
  const actorId = toId(actor?.id);
  if (!id) {
    throw new DomainError('거래를 찾을 수 없습니다.', { status: 404 });
  }
  if (!status) {
    throw new DomainError('상태 값이 필요합니다.');
  }

  return withTransaction(async (connection) => {
    const transaction = await lockTransaction(connection, id);
    if (!transaction) {
      throw new DomainError('거래를 찾을 수 없습니다.', { status: 404 });
    }

    const isBuyer = Number(transaction.buyer_id) === actorId;
    const isDesigner = Number(transaction.designer_id) === actorId;
    const isAdmin = actor?.role === 'admin';

    if (!isBuyer && !isDesigner && !isAdmin) {
      throw new DomainError('권한이 없습니다.', { status: 403 });
    }

    const denial = getTransitionDenial({ from: transaction.status, to: status, isBuyer, isDesigner, isAdmin });
    if (denial) {
      throw new DomainError(denial.message, { status: denial.status });
    }

    const actorKind = isBuyer ? 'buyer' : isDesigner ? 'designer' : 'admin';

    if (status === S.COMPLETED) {
      const settlement = await releaseEscrow(connection, transaction, actorKind);
      return { id, status, ...settlement };
    }

    if (status === S.CANCELLED) {
      const refund = await refundEscrow(connection, transaction, {
        cancelledBy: actorKind,
        reason: `${actorKind === 'buyer' ? '구매자' : actorKind === 'designer' ? '디자이너' : '관리자'} 취소`,
      });
      return { id, status, ...refund };
    }

    if (status === S.AWAITING_CONFIRMATION) {
      await connection.execute(
        `UPDATE transactions
            SET status = 'awaiting_confirmation', submitted_at = NOW(),
                auto_confirm_at = DATE_ADD(NOW(), INTERVAL ? DAY), auto_cancel_at = NULL
          WHERE id = ?`,
        [getAutoConfirmDays(), id]
      );
      return { id, status };
    }

    // in_progress: 작업 시작(pending →) 또는 수정 요청(awaiting_confirmation →)
    if (transaction.status === S.PENDING) {
      await connection.execute(
        "UPDATE transactions SET status = 'in_progress', started_at = NOW(), auto_cancel_at = NULL WHERE id = ?",
        [id]
      );
    } else {
      await connection.execute(
        "UPDATE transactions SET status = 'in_progress', submitted_at = NULL, auto_confirm_at = NULL WHERE id = ?",
        [id]
      );
    }
    return { id, status };
  });
}

/**
 * 자동정산 배치.
 *  - 작업 완료 제출 후 기한 내 구매확정이 없으면 → 자동 구매확정(정산)
 *  - 결제 후 기한 내 디자이너가 작업을 시작하지 않으면 → 자동 취소(환불)
 *
 * 여러 인스턴스가 동시에 실행해도 안전하다: 건마다 별도 트랜잭션에서 행을 잠그고
 * 조건을 다시 확인하므로, 먼저 처리한 쪽만 돈을 움직이고 나머지는 건너뛴다.
 */
export async function runAutoSettlement({ limit = 100 } = {}) {
  const batch = Math.max(1, Math.min(500, Math.floor(Number(limit)) || 100));

  const confirmTargets = await query(
    `SELECT id FROM transactions
      WHERE status = 'awaiting_confirmation' AND escrow_status = 'held'
        AND auto_confirm_at IS NOT NULL AND auto_confirm_at <= NOW()
      ORDER BY auto_confirm_at ASC
      LIMIT ${batch}`
  );
  const cancelTargets = await query(
    `SELECT id FROM transactions
      WHERE status = 'pending' AND escrow_status = 'held'
        AND auto_cancel_at IS NOT NULL AND auto_cancel_at <= NOW()
      ORDER BY auto_cancel_at ASC
      LIMIT ${batch}`
  );

  const summary = { confirmed: [], cancelled: [], skipped: [], failed: [] };

  for (const { id } of confirmTargets) {
    try {
      const done = await withTransaction(async (connection) => {
        const transaction = await lockTransaction(connection, id);
        const due = transaction
          && transaction.status === S.AWAITING_CONFIRMATION
          && transaction.escrow_status === E.HELD
          && Number(transaction.confirm_due) === 1;
        if (!due) return false;
        await releaseEscrow(connection, transaction, 'auto');
        return true;
      });
      (done ? summary.confirmed : summary.skipped).push(id);
    } catch (error) {
      console.error(`자동 구매확정 실패 (거래 #${id}):`, error);
      summary.failed.push({ id, error: error.message });
    }
  }

  for (const { id } of cancelTargets) {
    try {
      const done = await withTransaction(async (connection) => {
        const transaction = await lockTransaction(connection, id);
        const due = transaction
          && transaction.status === S.PENDING
          && transaction.escrow_status === E.HELD
          && Number(transaction.cancel_due) === 1;
        if (!due) return false;
        await refundEscrow(connection, transaction, {
          cancelledBy: 'auto',
          reason: '디자이너 미착수 자동 취소',
        });
        return true;
      });
      (done ? summary.cancelled : summary.skipped).push(id);
    } catch (error) {
      console.error(`자동 취소 실패 (거래 #${id}):`, error);
      summary.failed.push({ id, error: error.message });
    }
  }

  return summary;
}
