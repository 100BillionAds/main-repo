/** @jest-environment node */

import { Trade } from '@/domain/escrow/Trade';
import { handleNotificationEvent, notificationsFor } from '@/domain/notifications/notificationHandlers';
import { processOutboxEvent, relayOutbox } from '@/lib/events/eventBus';

function tradeOf(overrides = {}) {
  return Trade.fromRow({
    id: 1,
    buyer_id: 10,
    designer_id: 20,
    amount: 20000,
    status: 'pending',
    escrow_status: 'held',
    payment_status: 'completed',
    confirm_due: 0,
    cancel_due: 0,
    ...overrides,
  });
}

const buyer = { id: 10, role: 'user' };
const designer = { id: 20, role: 'designer' };

/** DB 대신 배열로 동작하는 아웃박스 */
function fakeOutbox(events) {
  const log = [];
  return {
    log,
    findById: async (id) => events.find((event) => event.id === id) || null,
    claimBatch: async () => events.filter((event) => !event.processedAt),
    markProcessed: async (id) => {
      log.push(['processed', id]);
      events.find((event) => event.id === id).processedAt = new Date();
    },
    markFailed: async (id, message) => log.push(['failed', id, message]),
  };
}

const pending = (id, type = 'trade.created') => ({ id, type, payload: {}, attempts: 0, processedAt: null });

describe('Trade 가 남기는 도메인 이벤트', () => {
  it('상태가 바뀔 때마다 무슨 일이 있었는지 기록한다', () => {
    const trade = tradeOf();

    trade.changeStatus(designer, 'in_progress');
    expect(trade.pullEvents()).toEqual([
      { type: 'trade.work_started', aggregateType: 'trade', aggregateId: 1, payload: { tradeId: 1, buyerId: 10, designerId: 20 } },
    ]);

    trade.changeStatus(designer, 'awaiting_confirmation');
    expect(trade.pullEvents()[0]).toMatchObject({ type: 'trade.work_submitted', payload: { autoConfirmDays: 7 } });

    trade.changeStatus(buyer, 'completed');
    expect(trade.pullEvents()[0]).toMatchObject({
      type: 'trade.completed',
      payload: { amount: 20000, commission: 2000, payout: 18000, settledBy: 'buyer' },
    });
  });

  it('꺼내 가면 비워지고, 거부된 요청은 이벤트를 남기지 않는다', () => {
    const trade = tradeOf();
    trade.changeStatus(designer, 'in_progress');
    trade.pullEvents();
    expect(trade.pullEvents()).toEqual([]);

    expect(() => trade.changeStatus(buyer, 'completed')).toThrow();
    expect(trade.pullEvents()).toEqual([]);
  });

  it('자동 취소는 환불 금액과 사유를 담는다', () => {
    const trade = tradeOf({ cancel_due: 1 });
    trade.autoCancel();
    expect(trade.pullEvents()[0]).toMatchObject({
      type: 'trade.cancelled',
      payload: { refunded: 20000, cancelledBy: 'auto', reason: '디자이너 미착수 자동 취소' },
    });
  });
});

describe('알림 소비자', () => {
  const base = { tradeId: 7, buyerId: 10, designerId: 20 };

  it('새 주문은 디자이너에게 알린다', () => {
    const [notification] = notificationsFor({ type: 'trade.created', payload: { ...base, amount: 20000, title: '카페 간판', autoCancelDays: 7 } });
    expect(notification.userId).toBe(20);
    expect(notification.body).toContain('"카페 간판" 20,000원');
    expect(notification.body).toContain('7일 안에');
  });

  it('정산 완료는 양쪽에 알리고, 자동 확정이면 그 사실을 밝힌다', () => {
    const manual = notificationsFor({ type: 'trade.completed', payload: { ...base, commission: 2000, payout: 18000, settledBy: 'buyer' } });
    expect(manual.map((item) => item.userId)).toEqual([20, 10]);
    expect(manual[0].body).toContain('18,000P');

    const auto = notificationsFor({ type: 'trade.completed', payload: { ...base, commission: 2000, payout: 18000, settledBy: 'auto' } });
    expect(auto[1].title).toBe('자동으로 구매확정되었습니다');
  });

  it('취소 알림은 환불이 있었을 때만 환불을 말한다', () => {
    const refunded = notificationsFor({ type: 'trade.cancelled', payload: { ...base, refunded: 20000, reason: '구매자 취소' } });
    expect(refunded[0].body).toBe('거래 #7 이 취소되어 20,000P 가 환불되었습니다 (구매자 취소).');

    const none = notificationsFor({ type: 'trade.cancelled', payload: { ...base, refunded: 0, reason: null } });
    expect(none[0].body).toBe('거래 #7 이 취소되었습니다.');
  });

  it('모르는 이벤트는 무시한다 (새 이벤트가 생겨도 깨지지 않는다)', () => {
    expect(notificationsFor({ type: 'something.new', payload: {} })).toEqual([]);
  });

  it('이벤트 id 와 거래 링크를 붙여 저장한다', async () => {
    const created = [];
    await handleNotificationEvent(
      { id: 5, type: 'trade.work_started', payload: base },
      { createOnce: async (notification) => created.push(notification) }
    );
    expect(created).toEqual([expect.objectContaining({ userId: 10, eventId: 5, type: 'trade.work_started', link: '/my-transactions/7' })]);
  });
});

describe('이벤트 처리', () => {
  it('성공하면 완료로 표시하고, 이미 처리된 이벤트는 건너뛴다', async () => {
    const repository = fakeOutbox([pending(1)]);
    const handler = jest.fn(async () => {});

    expect(await processOutboxEvent(1, { handlers: [handler], repository })).toBe('processed');
    expect(await processOutboxEvent(1, { handlers: [handler], repository })).toBe('skipped');
    expect(await processOutboxEvent(999, { handlers: [handler], repository })).toBe('skipped');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('실패하면 완료로 표시하지 않고 오류를 기록한 뒤 다시 던진다 (큐가 재시도하도록)', async () => {
    const repository = fakeOutbox([pending(2)]);
    const failing = async () => {
      throw new Error('알림 실패');
    };

    await expect(processOutboxEvent(2, { handlers: [failing], repository })).rejects.toThrow('알림 실패');
    expect(repository.log).toEqual([['failed', 2, '알림 실패']]);
  });

  it('큐가 없으면 릴레이가 그 자리에서 처리하고, 한 건의 실패가 나머지를 막지 않는다', async () => {
    const saved = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const repository = fakeOutbox([pending(1), pending(2, 'bad'), pending(3)]);
    const handler = async (event) => {
      if (event.type === 'bad') throw new Error('처리 불가');
    };

    const summary = await relayOutbox({ repository, handlers: [handler] });

    expect(summary).toEqual({ claimed: 3, queued: 0, inline: 2, failed: 1 });
    expect(repository.log).toEqual([['processed', 1], ['failed', 2, '처리 불가'], ['processed', 3]]);
    spy.mockRestore();
    if (saved !== undefined) process.env.REDIS_URL = saved;
  });
});
