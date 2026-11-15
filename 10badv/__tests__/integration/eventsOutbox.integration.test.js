/** @jest-environment node */

/**
 * 이벤트 아웃박스 통합 테스트 (실제 MySQL / TiDB, 큐 테스트는 Redis 필요)
 *
 * 확인하는 것
 *  - 이벤트 기록이 업무 변경과 한 트랜잭션인가 (롤백되면 이벤트도 없다)
 *  - 거래 흐름이 알림으로 이어지는가
 *  - 같은 이벤트를 다시 처리해도, 여러 서버가 동시에 릴레이해도 알림은 한 번인가
 *  - 실패한 이벤트가 다시 시도되는가
 *  - 큐(BullMQ) 경로로도 끝까지 처리되는가
 */

const defaults = {
  DATABASE_HOST: '127.0.0.1',
  DATABASE_PORT: '3306',
  DATABASE_USER: 'root',
  DATABASE_PASSWORD: 'root',
  DATABASE_NAME: '10badv_test',
};
for (const [key, value] of Object.entries(defaults)) {
  if (process.env[key] === undefined) process.env[key] = value;
}
if (process.env.CI && !process.env.TEST_REDIS_URL) {
  throw new Error('CI 에서는 TEST_REDIS_URL 이 필요합니다.');
}
// 앞쪽 테스트는 큐 없이(즉시 처리) 돌린다. 큐 테스트에서만 REDIS_URL 을 켠다.
delete process.env.REDIS_URL;

const db = require('@/lib/db');
const escrow = require('@/domain/escrow/escrowService');
const { relayOutbox, processOutboxEvent } = require('@/lib/events/eventBus');
const { startWorker, closeQueue } = require('@/lib/events/queue');

jest.setTimeout(120000);

const SUFFIX = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
let sequence = 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function createUser(role, points = 0) {
  sequence += 1;
  const username = `evt_${role}_${SUFFIX}_${sequence}`;
  const [result] = await db.default.execute(
    'INSERT INTO users (username, password, name, email, role, points) VALUES (?, ?, ?, ?, ?, ?)',
    [username, 'not-a-real-hash', username, `${username}@test.local`, role, points]
  );
  return result.insertId;
}

async function createPortfolio(designerId, price = 20000) {
  const [result] = await db.default.execute(
    "INSERT INTO portfolios (designer_id, title, description, category, price, status) VALUES (?, ?, ?, ?, ?, 'approved')",
    [designerId, `이벤트 테스트 시안 ${SUFFIX}`, '통합 테스트용', '간판', price]
  );
  return result.insertId;
}

async function setup({ buyerPoints = 100000 } = {}) {
  const buyerId = await createUser('user', buyerPoints);
  const designerId = await createUser('designer');
  const portfolioId = await createPortfolio(designerId);
  return { buyerId, designerId, portfolioId, designer: { id: designerId, role: 'designer' }, buyer: { id: buyerId, role: 'user' } };
}

async function eventsOf(tradeId) {
  return db.query("SELECT * FROM outbox_events WHERE aggregate_type = 'trade' AND aggregate_id = ? ORDER BY id", [tradeId]);
}

async function notificationTypes(userId) {
  const rows = await db.query('SELECT type FROM notifications WHERE user_id = ? ORDER BY id', [userId]);
  return rows.map((row) => row.type);
}

/** 다른 테스트가 남긴 것까지 포함해, 보낼 이벤트가 없을 때까지 릴레이한다. */
async function drain(options = {}) {
  for (let round = 0; round < 50; round += 1) {
    const summary = await relayOutbox({ limit: 500, ...options });
    if (summary.claimed === 0) return;
  }
  throw new Error('아웃박스가 비워지지 않습니다.');
}

describe('이벤트 아웃박스', () => {
  beforeAll(async () => {
    expect(await db.initializeDatabase()).toBe(true);
    await drain();
  });

  afterAll(async () => {
    await closeQueue();
    await db.closeDatabasePool();
  });

  it('구매하면 같은 트랜잭션에서 trade.created 이벤트가 기록된다', async () => {
    const { buyerId, designerId, portfolioId } = await setup();

    const { transactionId } = await escrow.purchasePortfolio({ buyerId, portfolioId });

    const events = await eventsOf(transactionId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event_type: 'trade.created', processed_at: null, enqueued_at: null });
    const payload = typeof events[0].payload === 'string' ? JSON.parse(events[0].payload) : events[0].payload;
    expect(payload).toMatchObject({ tradeId: transactionId, buyerId, designerId, amount: 20000 });
  });

  it('구매가 실패해 롤백되면 이벤트도 남지 않는다', async () => {
    const { buyerId, portfolioId } = await setup({ buyerPoints: 0 });
    const [before] = await db.query('SELECT COUNT(*) AS cnt FROM outbox_events');

    await expect(escrow.purchasePortfolio({ buyerId, portfolioId })).rejects.toMatchObject({ code: 'INSUFFICIENT_POINTS' });

    const [after] = await db.query('SELECT COUNT(*) AS cnt FROM outbox_events');
    expect(Number(after.cnt)).toBe(Number(before.cnt));
    const [trades] = await db.query('SELECT COUNT(*) AS cnt FROM transactions WHERE buyer_id = ?', [buyerId]);
    expect(Number(trades.cnt)).toBe(0);
  });

  it('거래 흐름이 당사자 알림으로 이어진다', async () => {
    const { buyerId, designerId, portfolioId, buyer, designer } = await setup();

    const { transactionId } = await escrow.purchasePortfolio({ buyerId, portfolioId });
    await escrow.changeTransactionStatus({ transactionId, actor: designer, status: 'in_progress' });
    await escrow.changeTransactionStatus({ transactionId, actor: designer, status: 'awaiting_confirmation' });
    await escrow.changeTransactionStatus({ transactionId, actor: buyer, status: 'completed' });

    // 릴레이 전에는 알림이 없다: 정산은 알림을 기다리지 않는다.
    expect(await notificationTypes(designerId)).toEqual([]);

    await drain();

    expect(await notificationTypes(designerId)).toEqual(['trade.created', 'trade.completed']);
    expect(await notificationTypes(buyerId)).toEqual(['trade.work_started', 'trade.work_submitted', 'trade.completed']);
    const events = await eventsOf(transactionId);
    expect(events.every((event) => event.processed_at !== null)).toBe(true);

    const [settled] = await db.query("SELECT body, link FROM notifications WHERE user_id = ? AND type = 'trade.completed'", [designerId]);
    expect(settled.body).toContain('18,000P');
    expect(settled.link).toBe(`/my-transactions/${transactionId}`);
  });

  it('같은 이벤트를 다시 처리해도 알림은 늘지 않는다 (멱등)', async () => {
    const { buyerId, designerId, portfolioId } = await setup();
    const { transactionId } = await escrow.purchasePortfolio({ buyerId, portfolioId });
    await drain();
    const [event] = await eventsOf(transactionId);

    // "처리는 했는데 완료 표시 직전에 서버가 죽은" 상황을 재현한다.
    await db.query('UPDATE outbox_events SET processed_at = NULL, enqueued_at = NULL WHERE id = ?', [event.id]);
    await drain();
    expect(await processOutboxEvent(event.id)).toBe('skipped');

    expect(await notificationTypes(designerId)).toEqual(['trade.created']);
  });

  it('여러 서버가 동시에 릴레이해도 이벤트마다 한 번만 가져가고 알림도 한 번이다', async () => {
    await drain();
    const trades = [];
    for (let index = 0; index < 6; index += 1) {
      const actors = await setup();
      const { transactionId } = await escrow.purchasePortfolio({ buyerId: actors.buyerId, portfolioId: actors.portfolioId });
      trades.push({ ...actors, transactionId });
    }

    const summaries = await Promise.all([relayOutbox(), relayOutbox(), relayOutbox(), relayOutbox()]);

    expect(summaries.reduce((sum, summary) => sum + summary.claimed, 0)).toBe(6);
    for (const trade of trades) {
      expect(await notificationTypes(trade.designerId)).toEqual(['trade.created']);
    }
  });

  it('처리에 실패한 이벤트는 기록이 남고, 시간이 지난 뒤 다시 시도된다', async () => {
    await drain();
    const { buyerId, designerId, portfolioId } = await setup();
    const { transactionId } = await escrow.purchasePortfolio({ buyerId, portfolioId });
    const failing = [
      async () => {
        throw new Error('알림 서버 장애');
      },
    ];
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const first = await relayOutbox({ handlers: failing });
    spy.mockRestore();

    expect(first).toMatchObject({ claimed: 1, failed: 1 });
    let [event] = await eventsOf(transactionId);
    expect(event).toMatchObject({ attempts: 1, last_error: '알림 서버 장애', processed_at: null });

    // 방금 보낸 것은 바로 다시 가져가지 않는다 (큐에서 처리 중일 수 있다).
    expect((await relayOutbox()).claimed).toBe(0);

    // 대기 시간이 지나면(여기서는 0초로 줄임) 다시 가져가 처리한다.
    await drain({ requeueAfterSeconds: 0 });
    [event] = await eventsOf(transactionId);
    expect(event.processed_at).not.toBeNull();
    expect(await notificationTypes(designerId)).toEqual(['trade.created']);
  });

  const itWithRedis = process.env.TEST_REDIS_URL ? it : it.skip;

  itWithRedis('Redis 가 있으면 큐에 넣고 워커가 처리한다', async () => {
    await drain();
    process.env.REDIS_URL = process.env.TEST_REDIS_URL;
    try {
      expect(startWorker((outboxId) => processOutboxEvent(outboxId))).toBeTruthy();
      const { buyerId, designerId, portfolioId, designer } = await setup();
      const { transactionId } = await escrow.purchasePortfolio({ buyerId, portfolioId });
      await escrow.changeTransactionStatus({ transactionId, actor: designer, status: 'in_progress' });

      const summary = await relayOutbox();
      expect(summary).toMatchObject({ claimed: 2, queued: 2, inline: 0 });

      // 워커는 따로 돈다. 처리될 때까지 기다린다.
      let events = [];
      for (let attempt = 0; attempt < 100; attempt += 1) {
        events = await eventsOf(transactionId);
        if (events.every((event) => event.processed_at !== null)) break;
        await sleep(100);
      }

      expect(events.map((event) => event.processed_at !== null)).toEqual([true, true]);
      expect(await notificationTypes(designerId)).toEqual(['trade.created']);
      expect(await notificationTypes(buyerId)).toEqual(['trade.work_started']);
    } finally {
      await closeQueue();
      delete process.env.REDIS_URL;
    }
  });
});
