/** @jest-environment node */

import {
  calculateSettlement,
  getAutoCancelDays,
  getAutoConfirmDays,
  getCommissionRate,
  getTransitionDenial,
  isValidTransition,
} from '@/domain/escrow/policy';

describe('에스크로 정책', () => {
  const ENV_KEYS = ['ESCROW_COMMISSION_RATE', 'ESCROW_AUTO_CONFIRM_DAYS', 'ESCROW_AUTO_CANCEL_DAYS'];
  const saved = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  describe('calculateSettlement', () => {
    it('기본 수수료 10%를 떼고 나머지를 지급액으로 계산한다', () => {
      expect(calculateSettlement(45000)).toEqual({ commission: 4500, payout: 40500 });
    });

    it('수수료는 원 단위로 내림하고, 수수료 + 지급액은 항상 원금과 같다', () => {
      const { commission, payout } = calculateSettlement(1005);
      expect(commission).toBe(100);
      expect(commission + payout).toBe(1005);
    });

    it('환경변수로 수수료율을 바꿀 수 있고, 범위를 벗어나면 기본값을 쓴다', () => {
      process.env.ESCROW_COMMISSION_RATE = '0.2';
      expect(getCommissionRate()).toBe(0.2);
      process.env.ESCROW_COMMISSION_RATE = '0.9';
      expect(getCommissionRate()).toBe(0.1);
      process.env.ESCROW_COMMISSION_RATE = 'abc';
      expect(getCommissionRate()).toBe(0.1);
    });
  });

  describe('자동정산 기한', () => {
    it('기본값은 7일이다', () => {
      expect(getAutoConfirmDays()).toBe(7);
      expect(getAutoCancelDays()).toBe(7);
    });

    it('환경변수 값을 정수 일수로 사용한다', () => {
      process.env.ESCROW_AUTO_CONFIRM_DAYS = '3';
      process.env.ESCROW_AUTO_CANCEL_DAYS = '14';
      expect(getAutoConfirmDays()).toBe(3);
      expect(getAutoCancelDays()).toBe(14);
    });
  });

  describe('상태 전환', () => {
    it('완료·취소된 거래는 더 이상 전환할 수 없다', () => {
      expect(isValidTransition('completed', 'cancelled')).toBe(false);
      expect(isValidTransition('cancelled', 'in_progress')).toBe(false);
      expect(isValidTransition('pending', 'completed')).toBe(false);
    });

    const roles = {
      buyer: { isBuyer: true, isDesigner: false, isAdmin: false },
      designer: { isBuyer: false, isDesigner: true, isAdmin: false },
      admin: { isBuyer: false, isDesigner: false, isAdmin: true },
    };

    it('구매확정은 구매자만 할 수 있다', () => {
      const move = { from: 'awaiting_confirmation', to: 'completed' };
      expect(getTransitionDenial({ ...move, ...roles.buyer })).toBeNull();
      expect(getTransitionDenial({ ...move, ...roles.designer })).toMatchObject({ status: 403 });
      expect(getTransitionDenial({ ...move, ...roles.admin })).toBeNull();
    });

    it('작업 시작과 작업 완료 제출은 디자이너만 할 수 있다', () => {
      expect(getTransitionDenial({ from: 'pending', to: 'in_progress', ...roles.buyer })).toMatchObject({ status: 403 });
      expect(getTransitionDenial({ from: 'pending', to: 'in_progress', ...roles.designer })).toBeNull();
      expect(getTransitionDenial({ from: 'in_progress', to: 'awaiting_confirmation', ...roles.buyer })).toMatchObject({ status: 403 });
      expect(getTransitionDenial({ from: 'in_progress', to: 'awaiting_confirmation', ...roles.designer })).toBeNull();
    });

    it('작업 시작 전에는 구매자도 취소할 수 있지만, 시작 후에는 디자이너·관리자만 취소할 수 있다', () => {
      expect(getTransitionDenial({ from: 'pending', to: 'cancelled', ...roles.buyer })).toBeNull();
      expect(getTransitionDenial({ from: 'in_progress', to: 'cancelled', ...roles.buyer })).toMatchObject({ status: 403 });
      expect(getTransitionDenial({ from: 'in_progress', to: 'cancelled', ...roles.designer })).toBeNull();
      expect(getTransitionDenial({ from: 'in_progress', to: 'cancelled', ...roles.admin })).toBeNull();
    });

    it('유효하지 않은 전환은 관리자여도 400으로 거부한다', () => {
      expect(getTransitionDenial({ from: 'completed', to: 'cancelled', ...roles.admin })).toMatchObject({ status: 400 });
    });
  });
});
