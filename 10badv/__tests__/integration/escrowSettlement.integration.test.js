/** @jest-environment node */

/**
 * 에스크로 자동정산 통합 테스트 (실제 MySQL 필요)
 *
 * 돈이 두 번 나가거나 사라지지 않는지를 동시 요청으로 검증한다.
 */

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
  __esModule: true,
  default: jest.fn(() => ({})),
}));

const defaults = {
  DATABASE_HOST: '127.0.0.1',
  DATABASE_PORT: '3306',
  DATABASE_USER: 'root',
  DATABASE_PASSWORD: 'root',
  DATABASE_NAME: '10badv_test',
  NEXTAUTH_SECRET: 'integration-secret',
  NEXTAUTH_URL: 'http://localhost:3000',
};
for (const [key, value] of Object.entries(defaults)) {
  if (process.env[key] === undefined) process.env[key] = value;
}
// 결제 검증 라우트는 모듈 로드 시점에 mock 모드를 읽는다.
process.env.PORTONE_MOCK_MODE = 'true';

const db = require('@/lib/db');
const escrow = require('@/domain/escrow/escrowService');
const verifyRoute = require('@/app/api/payments/verify/route');
const { getServerSession } = require('next-auth');

jest.setTimeout(60000);

const SUFFIX = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
let sequence = 0;

async function createUser(role, points = 0) {
  sequence += 1;
  const username = `escrow_${role}_${SUFFIX}_${sequence}`;
  const [result] = await db.default.execute(
    'INSERT INTO users (username, password, name, email, role, points) VALUES (?, ?, ?, ?, ?, ?)',
    [username, 'not-a-real-hash', username, `${username}@test.local`, role, points]
  );
  return result.insertId;
}

async function createPortfolio(designerId, price) {
  const [result] = await db.default.execute(
    "INSERT INTO portfolios (designer_id, title, description, category, price, status) VALUES (?, ?, ?, ?, ?, 'approved')",
    [designerId, `테스트 간판 시안 ${SUFFIX}`, '통합 테스트용', '간판', price]
  );
  return result.insertId;
}

async function pointsOf(userId) {
  const [row] = await db.query('SELECT points FROM users WHERE id = ?', [userId]);
  return row.points;
}

async function transactionOf(id) {
  const [row] = await db.query('SELECT * FROM transactions WHERE id = ?', [id]);
  return row;
}

async function ledgerCount(userId, type, transactionId) {
  const [row] = await db.query(
    "SELECT COUNT(*) AS cnt FROM point_transactions WHERE user_id = ? AND type = ? AND reference_type = 'transaction' AND reference_id = ?",
    [userId, type, transactionId]
  );
  return Number(row.cnt);
}

/** 구매 → 작업 시작 → 작업 완료 제출까지 진행한 거래를 만든다. */
async function createAwaitingTransaction({ buyerPoints = 100000, price = 30000 } = {}) {
  const buyerId = await createUser('user', buyerPoints);
  const designerId = await createUser('designer', 0);
  const portfolioId = await createPortfolio(designerId, price);

  const { transactionId } = await escrow.purchasePortfolio({ buyerId, portfolioId });
  const designer = { id: designerId, role: 'designer' };
  await escrow.changeTransactionStatus({ transactionId, actor: designer, status: 'in_progress' });
  await escrow.changeTransactionStatus({ transactionId, actor: designer, status: 'awaiting_confirmation' });

  return { buyerId, designerId, portfolioId, transactionId, price };
}

function countFulfilled(results) {
  return results.filter((result) => result.status === 'fulfilled').length;
}

describe('에스크로 자동정산', () => {
  beforeAll(async () => {
    const ok = await db.initializeDatabase();
    expect(ok).toBe(true);
  });

  afterEach(() => {
    getServerSession.mockReset();
  });

  afterAll(async () => {
    await db.closeDatabasePool();
  });

  describe('보관 (hold)', () => {
    it('구매 시 구매자 포인트를 차감해 에스크로로 보관하고 자동 취소 기한을 건다', async () => {
      const buyerId = await createUser('user', 100000);
      const designerId = await createUser('designer', 0);
      const portfolioId = await createPortfolio(designerId, 30000);

      const { transactionId, points } = await escrow.purchasePortfolio({ buyerId, portfolioId, requestedAmount: 30000 });

      expect(points).toBe(70000);
      expect(await pointsOf(buyerId)).toBe(70000);
      expect(await pointsOf(designerId)).toBe(0);

      const transaction = await transactionOf(transactionId);
      expect(transaction.status).toBe('pending');
      expect(transaction.escrow_status).toBe('held');
      expect(transaction.amount).toBe(30000);
      expect(transaction.auto_cancel_at).not.toBeNull();
      expect(await ledgerCount(buyerId, 'use', transactionId)).toBe(1);
    });

    it('포인트가 부족하면 거래를 만들지 않는다', async () => {
      const buyerId = await createUser('user', 10000);
      const designerId = await createUser('designer', 0);
      const portfolioId = await createPortfolio(designerId, 30000);

      await expect(escrow.purchasePortfolio({ buyerId, portfolioId })).rejects.toMatchObject({
        code: 'INSUFFICIENT_POINTS',
      });

      expect(await pointsOf(buyerId)).toBe(10000);
      const rows = await db.query('SELECT id FROM transactions WHERE buyer_id = ?', [buyerId]);
      expect(rows).toHaveLength(0);
    });

    it('동시에 여러 번 구매해도 잔액만큼만 성공한다', async () => {
      const buyerId = await createUser('user', 30000);
      const designerId = await createUser('designer', 0);
      const portfolioId = await createPortfolio(designerId, 30000);

      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () => escrow.purchasePortfolio({ buyerId, portfolioId }))
      );

      expect(countFulfilled(results)).toBe(1);
      expect(await pointsOf(buyerId)).toBe(0);
      const rows = await db.query('SELECT id FROM transactions WHERE buyer_id = ?', [buyerId]);
      expect(rows).toHaveLength(1);
    });

    it('제안 수락 시 포인트가 부족하면 수락되지 않고 의뢰는 열린 상태로 남는다', async () => {
      const clientId = await createUser('user', 1000);
      const designerId = await createUser('designer', 0);
      const [requestResult] = await db.default.execute(
        "INSERT INTO requests (client_id, title, description, category, budget, status) VALUES (?, ?, ?, ?, ?, 'OPEN')",
        [clientId, `간판 의뢰 ${SUFFIX}`, '통합 테스트용', '간판', 50000]
      );
      const [proposalResult] = await db.default.execute(
        "INSERT INTO proposals (request_id, designer_id, message, offer_price, status) VALUES (?, ?, ?, ?, 'PENDING')",
        [requestResult.insertId, designerId, '제안드립니다', 45000]
      );

      await expect(
        escrow.decideProposal({ proposalId: proposalResult.insertId, clientId, decision: 'ACCEPTED' })
      ).rejects.toMatchObject({ code: 'INSUFFICIENT_POINTS' });

      const [request] = await db.query('SELECT status FROM requests WHERE id = ?', [requestResult.insertId]);
      const [proposal] = await db.query('SELECT status FROM proposals WHERE id = ?', [proposalResult.insertId]);
      expect(request.status).toBe('OPEN');
      expect(proposal.status).toBe('PENDING');
      expect(await pointsOf(clientId)).toBe(1000);
    });

    it('제안 수락 시 제안 금액이 에스크로로 보관된다', async () => {
      const clientId = await createUser('user', 100000);
      const designerId = await createUser('designer', 0);
      const [requestResult] = await db.default.execute(
        "INSERT INTO requests (client_id, title, description, category, budget, status) VALUES (?, ?, ?, ?, ?, 'OPEN')",
        [clientId, `간판 의뢰 ${SUFFIX}`, '통합 테스트용', '간판', 50000]
      );
      const [proposalResult] = await db.default.execute(
        "INSERT INTO proposals (request_id, designer_id, message, offer_price, status) VALUES (?, ?, ?, ?, 'PENDING')",
        [requestResult.insertId, designerId, '제안드립니다', 45000]
      );

      const { transactionId } = await escrow.decideProposal({
        proposalId: proposalResult.insertId,
        clientId,
        decision: 'ACCEPTED',
      });

      expect(await pointsOf(clientId)).toBe(55000);
      const transaction = await transactionOf(transactionId);
      expect(transaction.escrow_status).toBe('held');
      expect(transaction.amount).toBe(45000);
    });
  });

  describe('정산 (release)', () => {
    it('구매확정 요청이 동시에 여러 번 와도 디자이너에게 한 번만 지급한다', async () => {
      const { buyerId, designerId, transactionId } = await createAwaitingTransaction();
      const buyer = { id: buyerId, role: 'user' };

      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () =>
          escrow.changeTransactionStatus({ transactionId, actor: buyer, status: 'completed' })
        )
      );

      expect(countFulfilled(results)).toBe(1);
      expect(await pointsOf(designerId)).toBe(27000);
      expect(await pointsOf(buyerId)).toBe(70000);
      expect(await ledgerCount(designerId, 'earn', transactionId)).toBe(1);

      const transaction = await transactionOf(transactionId);
      expect(transaction.status).toBe('completed');
      expect(transaction.escrow_status).toBe('released');
      expect(transaction.commission).toBe(3000);
      expect(transaction.settled_by).toBe('buyer');
    });

    it('포인트가 보관되지 않은 거래는 완료 처리해도 지급하지 않는다', async () => {
      const buyerId = await createUser('user', 0);
      const designerId = await createUser('designer', 0);
      const [result] = await db.default.execute(
        `INSERT INTO transactions (buyer_id, designer_id, amount, status, payment_status, escrow_status)
         VALUES (?, ?, 45000, 'awaiting_confirmation', 'pending', 'none')`,
        [buyerId, designerId]
      );

      await expect(
        escrow.changeTransactionStatus({
          transactionId: result.insertId,
          actor: { id: buyerId, role: 'user' },
          status: 'completed',
        })
      ).rejects.toMatchObject({ code: 'ESCROW_NOT_HELD' });

      expect(await pointsOf(designerId)).toBe(0);
      expect((await transactionOf(result.insertId)).status).toBe('awaiting_confirmation');
    });
  });

  describe('환불 (refund)', () => {
    it('작업 시작과 취소가 동시에 와도 돈의 총합은 보존된다', async () => {
      const buyerId = await createUser('user', 100000);
      const designerId = await createUser('designer', 0);
      const portfolioId = await createPortfolio(designerId, 30000);
      const { transactionId } = await escrow.purchasePortfolio({ buyerId, portfolioId });

      await Promise.allSettled([
        escrow.changeTransactionStatus({ transactionId, actor: { id: designerId, role: 'designer' }, status: 'in_progress' }),
        escrow.changeTransactionStatus({ transactionId, actor: { id: buyerId, role: 'user' }, status: 'cancelled' }),
        escrow.changeTransactionStatus({ transactionId, actor: { id: buyerId, role: 'user' }, status: 'cancelled' }),
      ]);

      const transaction = await transactionOf(transactionId);
      const buyerPoints = await pointsOf(buyerId);

      if (transaction.status === 'cancelled') {
        expect(transaction.escrow_status).toBe('refunded');
        expect(buyerPoints).toBe(100000);
        expect(await ledgerCount(buyerId, 'refund', transactionId)).toBe(1);
      } else {
        expect(transaction.status).toBe('in_progress');
        expect(transaction.escrow_status).toBe('held');
        expect(buyerPoints).toBe(70000);
        expect(await ledgerCount(buyerId, 'refund', transactionId)).toBe(0);
      }
      expect(await pointsOf(designerId)).toBe(0);
    });

    it('작업이 시작된 뒤에는 구매자가 취소할 수 없다', async () => {
      const buyerId = await createUser('user', 100000);
      const designerId = await createUser('designer', 0);
      const portfolioId = await createPortfolio(designerId, 30000);
      const { transactionId } = await escrow.purchasePortfolio({ buyerId, portfolioId });
      await escrow.changeTransactionStatus({ transactionId, actor: { id: designerId, role: 'designer' }, status: 'in_progress' });

      await expect(
        escrow.changeTransactionStatus({ transactionId, actor: { id: buyerId, role: 'user' }, status: 'cancelled' })
      ).rejects.toMatchObject({ status: 403 });

      expect(await pointsOf(buyerId)).toBe(70000);
    });
  });

  describe('자동정산 배치', () => {
    it('기한이 지난 구매확정 대기 거래를 자동으로 정산하고, 기한 전 거래는 건드리지 않는다', async () => {
      const due = await createAwaitingTransaction();
      const notDue = await createAwaitingTransaction();

      expect((await transactionOf(due.transactionId)).auto_confirm_at).not.toBeNull();

      await db.query(
        'UPDATE transactions SET auto_confirm_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id = ?',
        [due.transactionId]
      );

      const summary = await escrow.runAutoSettlement();

      expect(summary.confirmed).toContain(due.transactionId);
      expect(summary.confirmed).not.toContain(notDue.transactionId);
      expect(summary.failed).toHaveLength(0);

      const settled = await transactionOf(due.transactionId);
      expect(settled.status).toBe('completed');
      expect(settled.escrow_status).toBe('released');
      expect(settled.settled_by).toBe('auto');
      expect(await pointsOf(due.designerId)).toBe(27000);

      expect((await transactionOf(notDue.transactionId)).status).toBe('awaiting_confirmation');
      expect(await pointsOf(notDue.designerId)).toBe(0);

      // 다시 돌려도 이미 정산된 거래는 대상이 아니다
      const again = await escrow.runAutoSettlement();
      expect(again.confirmed).not.toContain(due.transactionId);
      expect(await pointsOf(due.designerId)).toBe(27000);
    });

    it('배치가 동시에 여러 개 실행되어도 한 번만 정산한다', async () => {
      const { designerId, transactionId } = await createAwaitingTransaction();
      await db.query(
        'UPDATE transactions SET auto_confirm_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id = ?',
        [transactionId]
      );

      const summaries = await Promise.all([
        escrow.runAutoSettlement(),
        escrow.runAutoSettlement(),
        escrow.runAutoSettlement(),
      ]);

      const confirmedCount = summaries.filter((summary) => summary.confirmed.includes(transactionId)).length;
      expect(confirmedCount).toBe(1);
      expect(await pointsOf(designerId)).toBe(27000);
      expect(await ledgerCount(designerId, 'earn', transactionId)).toBe(1);
    });

    it('수정 요청이 들어오면 자동 구매확정 기한이 해제된다', async () => {
      const { buyerId, transactionId } = await createAwaitingTransaction();

      await escrow.changeTransactionStatus({ transactionId, actor: { id: buyerId, role: 'user' }, status: 'in_progress' });

      const transaction = await transactionOf(transactionId);
      expect(transaction.status).toBe('in_progress');
      expect(transaction.auto_confirm_at).toBeNull();
    });

    it('디자이너가 기한 내 작업을 시작하지 않으면 자동 취소하고 전액 환불한다', async () => {
      const buyerId = await createUser('user', 100000);
      const designerId = await createUser('designer', 0);
      const portfolioId = await createPortfolio(designerId, 30000);
      const { transactionId } = await escrow.purchasePortfolio({ buyerId, portfolioId });

      await db.query(
        'UPDATE transactions SET auto_cancel_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id = ?',
        [transactionId]
      );

      const summary = await escrow.runAutoSettlement();
      expect(summary.cancelled).toContain(transactionId);

      const transaction = await transactionOf(transactionId);
      expect(transaction.status).toBe('cancelled');
      expect(transaction.escrow_status).toBe('refunded');
      expect(transaction.settled_by).toBe('auto');
      expect(await pointsOf(buyerId)).toBe(100000);
      expect(await pointsOf(designerId)).toBe(0);
    });
  });

  describe('결제 검증 (포인트 충전)', () => {
    it('같은 결제의 검증 요청이 동시에 와도 포인트는 한 번만 충전된다', async () => {
      const userId = await createUser('user', 0);
      const merchantUid = `order_test_${SUFFIX}_${userId}`;
      const [paymentResult] = await db.default.execute(
        "INSERT INTO payments (user_id, merchant_uid, amount, payment_method, order_name, status) VALUES (?, ?, 10000, 'card', '포인트 충전', 'pending')",
        [userId, merchantUid]
      );

      getServerSession.mockResolvedValue({ user: { id: String(userId), role: 'user' } });

      const makeRequest = () => ({
        headers: new Headers(),
        json: async () => ({ paymentId: `mock_${merchantUid}`, merchant_uid: merchantUid }),
      });

      const responses = await Promise.all(Array.from({ length: 5 }, () => verifyRoute.POST(makeRequest())));

      for (const response of responses) {
        expect(response.status).toBe(200);
      }
      expect(await pointsOf(userId)).toBe(10000);

      const [row] = await db.query(
        "SELECT COUNT(*) AS cnt FROM point_transactions WHERE user_id = ? AND type = 'charge' AND reference_type = 'payment' AND reference_id = ?",
        [userId, paymentResult.insertId]
      );
      expect(Number(row.cnt)).toBe(1);
    });
  });
});
