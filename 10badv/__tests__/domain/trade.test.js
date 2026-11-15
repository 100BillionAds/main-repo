/** @jest-environment node */

import { Trade } from '@/domain/escrow/Trade';

/** DB 없이 거래 규칙만 검증한다. */
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

const buyer = { id: '10', role: 'user' };
const designer = { id: 20, role: 'designer' };
const admin = { id: 99, role: 'admin' };
const stranger = { id: 5, role: 'user' };

describe('Trade (거래 엔티티)', () => {
  describe('역할', () => {
    it('당사자가 아니면 아무것도 할 수 없다', () => {
      expect(() => tradeOf().changeStatus(stranger, 'in_progress')).toThrow(expect.objectContaining({ status: 403 }));
    });

    it('당사자 역할이 관리자 권한보다 우선한다', () => {
      expect(tradeOf().roleOf({ id: 10, role: 'admin' })).toBe('buyer');
      expect(tradeOf().roleOf(admin)).toBe('admin');
      expect(tradeOf().roleOf(stranger)).toBeNull();
    });
  });

  describe('작업 흐름', () => {
    it('디자이너가 작업을 시작하면 자동 취소 기한이 풀린다', () => {
      const trade = tradeOf();

      expect(trade.changeStatus(designer, 'in_progress')).toEqual({});

      expect(trade.status).toBe('in_progress');
      expect(trade.pullChanges()).toEqual({ status: 'in_progress', startedAt: { kind: 'now' }, autoCancelAt: null });
    });

    it('구매자는 작업을 시작할 수 없고, 시작 전 거래를 바로 완료할 수도 없다', () => {
      expect(() => tradeOf().changeStatus(buyer, 'in_progress')).toThrow(expect.objectContaining({ status: 403 }));
      expect(() => tradeOf().changeStatus(buyer, 'completed')).toThrow(expect.objectContaining({ status: 400 }));
    });

    it('작업 완료를 제출하면 자동 구매확정 기한(기본 7일)이 걸린다', () => {
      const trade = tradeOf({ status: 'in_progress' });

      trade.changeStatus(designer, 'awaiting_confirmation');

      const changes = trade.pullChanges();
      expect(changes.submittedAt).toEqual({ kind: 'now' });
      expect(changes.autoConfirmAt).toEqual({ kind: 'daysFromNow', days: 7 });
    });

    it('구매자가 수정을 요청하면 자동 구매확정 기한이 사라진다', () => {
      const trade = tradeOf({ status: 'awaiting_confirmation' });

      trade.changeStatus(buyer, 'in_progress');

      expect(trade.pullChanges()).toEqual({ status: 'in_progress', submittedAt: null, autoConfirmAt: null });
    });

    it('변경분은 한 번 꺼내면 비워진다', () => {
      const trade = tradeOf();
      trade.changeStatus(designer, 'in_progress');
      trade.pullChanges();
      expect(trade.pullChanges()).toEqual({});
    });
  });

  describe('정산 (release)', () => {
    it('구매자가 확정하면 수수료 10%를 떼고 디자이너 몫을 계산한다', () => {
      const trade = tradeOf({ status: 'awaiting_confirmation' });

      const outcome = trade.changeStatus(buyer, 'completed');

      expect(outcome).toEqual({ commission: 2000, payout: 18000, settledBy: 'buyer' });
      expect(trade.escrowStatus).toBe('released');
      expect(trade.pullChanges()).toMatchObject({
        status: 'completed',
        escrowStatus: 'released',
        commission: 2000,
        settledBy: 'buyer',
        autoConfirmAt: null,
      });
    });

    it('디자이너는 자기 작업을 스스로 확정할 수 없다', () => {
      const trade = tradeOf({ status: 'awaiting_confirmation' });
      expect(() => trade.changeStatus(designer, 'completed')).toThrow(
        expect.objectContaining({ status: 403, message: '광고주만 거래 완료 승인을 할 수 있습니다.' })
      );
    });

    it('한 번 정산된 거래는 다시 정산되지 않는다', () => {
      const trade = tradeOf({ status: 'awaiting_confirmation' });
      trade.changeStatus(buyer, 'completed');
      expect(() => trade.changeStatus(buyer, 'completed')).toThrow(expect.objectContaining({ status: 400 }));
    });

    it('보관금이 없는 거래는 정산할 수 없다', () => {
      const trade = tradeOf({ status: 'awaiting_confirmation', escrow_status: 'none' });
      expect(() => trade.changeStatus(buyer, 'completed')).toThrow(
        expect.objectContaining({ status: 409, code: 'ESCROW_NOT_HELD' })
      );
    });
  });

  describe('환불 (refund)', () => {
    it('작업 시작 전에는 구매자가 취소해 전액 환불받는다', () => {
      const trade = tradeOf();

      const outcome = trade.changeStatus(buyer, 'cancelled');

      expect(outcome).toEqual({ refunded: 20000, reason: '구매자 취소' });
      expect(trade.pullChanges()).toMatchObject({
        status: 'cancelled',
        escrowStatus: 'refunded',
        paymentStatus: 'refunded',
        settledBy: 'buyer',
        cancelReason: '구매자 취소',
      });
    });

    it('작업이 시작된 뒤에는 구매자가 일방적으로 취소할 수 없다', () => {
      const trade = tradeOf({ status: 'in_progress' });
      expect(() => trade.changeStatus(buyer, 'cancelled')).toThrow(expect.objectContaining({ status: 403 }));
    });

    it('보관금이 없는 거래를 취소하면 돈은 움직이지 않고 에스크로 상태도 그대로다', () => {
      const trade = tradeOf({ escrow_status: 'none', payment_status: 'pending' });

      const outcome = trade.changeStatus(admin, 'cancelled');

      expect(outcome.refunded).toBe(0);
      const changes = trade.pullChanges();
      expect(changes).not.toHaveProperty('escrowStatus');
      expect(changes).not.toHaveProperty('paymentStatus');
      expect(changes.settledBy).toBe('admin');
    });
  });

  describe('자동정산', () => {
    it('기한이 지난 작업 완료 제출 건은 자동 구매확정된다', () => {
      const trade = tradeOf({ status: 'awaiting_confirmation', confirm_due: 1 });

      expect(trade.isAutoConfirmDue).toBe(true);
      expect(trade.autoConfirm()).toEqual({ commission: 2000, payout: 18000, settledBy: 'auto' });
    });

    it('기한이 지나지 않았으면 자동 구매확정하지 않는다', () => {
      const trade = tradeOf({ status: 'awaiting_confirmation', confirm_due: 0 });

      expect(trade.isAutoConfirmDue).toBe(false);
      expect(() => trade.autoConfirm()).toThrow(expect.objectContaining({ code: 'NOT_DUE' }));
    });

    it('디자이너가 기한 내 시작하지 않은 거래는 자동 취소·환불된다', () => {
      const trade = tradeOf({ cancel_due: 1 });

      expect(trade.autoCancel()).toEqual({ refunded: 20000, reason: '디자이너 미착수 자동 취소' });
      expect(trade.pullChanges().settledBy).toBe('auto');
    });

    it('이미 작업이 시작된 거래는 기한이 지나도 자동 취소되지 않는다', () => {
      const trade = tradeOf({ status: 'in_progress', cancel_due: 1 });
      expect(trade.isAutoCancelDue).toBe(false);
    });
  });
});
