import { withTransaction } from '@/lib/db';
import { DomainError } from '@/domain/errors';
import { creditPoints, debitPoints } from '@/domain/points/ledger';
import * as trades from '@/domain/escrow/tradeRepository';
import * as outbox from '@/domain/events/outboxRepository';
import { EVENT } from '@/domain/events/eventTypes';
import { getAutoCancelDays } from '@/domain/escrow/policy';
import { kickRelay } from '@/lib/events/eventBus';

/**
 * 에스크로 서비스 (응용 서비스)
 *
 * 돈이 움직이는 모든 흐름이 여기를 지난다. 이 파일은 "순서"만 정한다.
 *
 *   1. 트랜잭션을 열고 거래를 잠가서 읽는다        → tradeRepository
 *   2. 거래에게 일을 시킨다 (규칙 판단, 금액 계산)  → Trade 엔티티
 *   3. 바뀐 거래를 저장한다                        → tradeRepository
 *   4. 포인트를 실제로 옮긴다                      → 포인트 원장(ledger)
 *   5. 일어난 일을 이벤트로 남긴다                 → 아웃박스 (같은 트랜잭션)
 *
 * 5번이 핵심이다. 상태 변경·포인트 이동·이벤트 기록이 한 트랜잭션이라, "정산은 됐는데 이벤트가 없다"거나
 * "이벤트는 나갔는데 정산이 롤백됐다"가 일어나지 않는다. 알림 같은 후속 작업은 커밋된 뒤 따로 처리된다.
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

function toId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function tradeCreatedEvent({ transactionId, buyerId, designerId, amount, title }) {
  return {
    type: EVENT.TRADE_CREATED,
    aggregateType: 'trade',
    aggregateId: transactionId,
    payload: { tradeId: transactionId, buyerId, designerId, amount, title, autoCancelDays: getAutoCancelDays() },
  };
}

/** 정산 결과대로 디자이너에게 대금을 지급한다. */
async function payDesigner(connection, trade, { commission, payout, settledBy }) {
  if (payout <= 0) return;
  const label = settledBy === 'auto' ? '자동 구매확정' : '완료';
  await creditPoints(connection, {
    userId: trade.designerId,
    type: 'earn',
    amount: payout,
    description: `거래 #${trade.id} ${label} 대금 지급 (수수료 ${commission.toLocaleString()}원 차감)`,
    referenceType: 'transaction',
    referenceId: trade.id,
  });
}

/** 환불 결과대로 구매자에게 보관금을 돌려준다. */
async function refundBuyer(connection, trade, { refunded, reason }) {
  if (refunded <= 0) return;
  await creditPoints(connection, {
    userId: trade.buyerId,
    type: 'refund',
    amount: refunded,
    description: `거래 #${trade.id} 취소 환불${reason ? ` (${reason})` : ''}`,
    referenceType: 'transaction',
    referenceId: trade.id,
  });
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

  const result = await withTransaction(async (connection) => {
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

    const transactionId = await trades.insertHeld(connection, {
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

    await outbox.append(connection, [
      tradeCreatedEvent({ transactionId, buyerId: buyer, designerId: Number(item.designer_id), amount: price, title: item.title }),
    ]);

    return { transactionId, points };
  });

  // 커밋된 뒤에 후속 처리를 깨운다. 실패해도 이벤트는 아웃박스에 남아 있어 나중에 처리된다.
  kickRelay();
  return result;
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

  const result = await withTransaction(async (connection) => {
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

    const transactionId = await trades.insertHeld(connection, {
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

    await outbox.append(connection, [
      tradeCreatedEvent({
        transactionId,
        buyerId: client,
        designerId: Number(proposal.designer_id),
        amount,
        title: request.title,
      }),
    ]);

    return { proposalId: id, transactionId };
  });

  kickRelay();
  return result;
}

/**
 * 거래 상태 변경 (작업 시작 / 작업 완료 제출 / 수정 요청 / 구매확정 / 취소)
 * @param {{ transactionId: number|string, actor: { id: number|string, role: string }, status: string }} input
 */
export async function changeTransactionStatus({ transactionId, actor, status }) {
  const id = toId(transactionId);
  if (!id) {
    throw new DomainError('거래를 찾을 수 없습니다.', { status: 404 });
  }
  if (!status) {
    throw new DomainError('상태 값이 필요합니다.');
  }

  const result = await withTransaction(async (connection) => {
    const trade = await trades.findByIdForUpdate(connection, id);
    if (!trade) {
      throw new DomainError('거래를 찾을 수 없습니다.', { status: 404 });
    }

    const outcome = trade.changeStatus(actor, status);
    await trades.save(connection, trade);
    await outbox.append(connection, trade.pullEvents());

    if (outcome.payout !== undefined) {
      await payDesigner(connection, trade, outcome);
      return { id, status, commission: outcome.commission, payout: outcome.payout };
    }
    if (outcome.refunded !== undefined) {
      await refundBuyer(connection, trade, outcome);
      return { id, status, refunded: outcome.refunded };
    }
    return { id, status };
  });

  kickRelay();
  return result;
}

/**
 * 후보 거래를 한 건씩, 건마다 별도 트랜잭션으로 처리한다.
 * 한 건이 실패해도 나머지는 계속 처리하고, 실패는 요약에 남긴다.
 */
async function settleEach(ids, label, settleOne, summary, doneList) {
  for (const id of ids) {
    try {
      const done = await withTransaction(async (connection) => {
        const trade = await trades.findByIdForUpdate(connection, id);
        return trade ? settleOne(connection, trade) : false;
      });
      (done ? doneList : summary.skipped).push(id);
    } catch (error) {
      console.error(`${label} 실패 (거래 #${id}):`, error);
      summary.failed.push({ id, error: error.message });
    }
  }
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
  const confirmIds = await trades.findAutoConfirmCandidateIds(limit);
  const cancelIds = await trades.findAutoCancelCandidateIds(limit);

  const summary = { confirmed: [], cancelled: [], skipped: [], failed: [] };

  await settleEach(confirmIds, '자동 구매확정', async (connection, trade) => {
    // 후보를 고른 뒤 잠그기 전까지 사이에 구매자가 직접 확정했을 수 있다.
    if (!trade.isAutoConfirmDue) return false;
    const settlement = trade.autoConfirm();
    await trades.save(connection, trade);
    await outbox.append(connection, trade.pullEvents());
    await payDesigner(connection, trade, settlement);
    return true;
  }, summary, summary.confirmed);

  await settleEach(cancelIds, '자동 취소', async (connection, trade) => {
    if (!trade.isAutoCancelDue) return false;
    const refund = trade.autoCancel();
    await trades.save(connection, trade);
    await outbox.append(connection, trade.pullEvents());
    await refundBuyer(connection, trade, refund);
    return true;
  }, summary, summary.cancelled);

  kickRelay();
  return summary;
}
