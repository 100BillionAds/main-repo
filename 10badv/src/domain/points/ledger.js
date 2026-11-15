import { DomainError } from '@/domain/errors';

/**
 * 포인트 원장(Ledger)
 *
 * 포인트 잔액(users.points)을 바꾸는 유일한 통로다.
 * - 항상 호출자의 트랜잭션(connection) 안에서 실행한다.
 * - 사용자 행을 FOR UPDATE 로 잠근 뒤 잔액을 계산하므로 동시 요청에도 잔액이 꼬이지 않는다.
 * - 잔액 변경과 point_transactions 기록을 반드시 함께 남긴다.
 */

async function lockBalance(connection, userId) {
  const [rows] = await connection.execute(
    'SELECT points FROM users WHERE id = ? FOR UPDATE',
    [userId]
  );

  if (rows.length === 0) {
    throw new DomainError('사용자 정보를 찾을 수 없습니다.', { status: 404, code: 'USER_NOT_FOUND' });
  }

  return Number(rows[0].points || 0);
}

function assertAmount(amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new DomainError('포인트 금액이 유효하지 않습니다.', { code: 'INVALID_AMOUNT' });
  }
}

async function record(connection, entry, balanceAfter) {
  await connection.execute(
    `INSERT INTO point_transactions
       (user_id, type, amount, fee, balance_after, description, reference_type, reference_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.userId,
      entry.type,
      entry.amount,
      entry.fee || 0,
      balanceAfter,
      entry.description || null,
      entry.referenceType || null,
      entry.referenceId ?? null,
      entry.status || 'completed',
    ]
  );
}

/**
 * 포인트 적립 (charge / earn / refund)
 * @returns {Promise<number>} 적립 후 잔액
 */
export async function creditPoints(connection, entry) {
  assertAmount(entry.amount);

  const balance = await lockBalance(connection, entry.userId);
  const balanceAfter = balance + entry.amount;

  await connection.execute('UPDATE users SET points = ? WHERE id = ?', [balanceAfter, entry.userId]);
  await record(connection, entry, balanceAfter);

  return balanceAfter;
}

/**
 * 포인트 차감 (use / withdraw). 잔액에서 amount + fee 를 뺀다.
 * @returns {Promise<number>} 차감 후 잔액
 */
export async function debitPoints(connection, entry) {
  assertAmount(entry.amount);

  const fee = entry.fee || 0;
  const total = entry.amount + fee;
  const balance = await lockBalance(connection, entry.userId);

  if (balance < total) {
    throw new DomainError(
      `포인트가 부족합니다. (필요: ${total.toLocaleString()}P, 보유: ${balance.toLocaleString()}P)`,
      { code: 'INSUFFICIENT_POINTS' }
    );
  }

  const balanceAfter = balance - total;

  await connection.execute('UPDATE users SET points = ? WHERE id = ?', [balanceAfter, entry.userId]);
  await record(connection, entry, balanceAfter);

  return balanceAfter;
}
