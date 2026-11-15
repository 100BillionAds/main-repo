/** @jest-environment node */

import { Money } from '@/domain/shared/Money';
import { calculateSettlement } from '@/domain/escrow/policy';

describe('Money (금액 값 객체)', () => {
  it('원 단위 정수만 만들 수 있다', () => {
    expect(Money.of(45000).toNumber()).toBe(45000);
    expect(Money.of('45000').toNumber()).toBe(45000);
    expect(Money.zero().isZero()).toBe(true);
  });

  it.each([[-1], [1.5], [NaN], [Infinity], ['abc'], [null], [undefined]])('%p 는 금액이 될 수 없다', (value) => {
    expect(() => Money.of(value)).toThrow(expect.objectContaining({ code: 'INVALID_AMOUNT' }));
  });

  it('값이 같으면 같은 금액이다', () => {
    expect(Money.of(1000).equals(Money.of(1000))).toBe(true);
    expect(Money.of(1000).equals(Money.of(2000))).toBe(false);
    expect(Money.of(1000).equals(1000)).toBe(false);
  });

  it('계산은 새 객체를 돌려주고 원래 값은 바뀌지 않는다', () => {
    const base = Money.of(10000);
    expect(base.plus(Money.of(500)).toNumber()).toBe(10500);
    expect(base.minus(3000).toNumber()).toBe(7000);
    expect(base.toNumber()).toBe(10000);
  });

  it('빼기 결과가 음수면 거부한다', () => {
    expect(() => Money.of(1000).minus(1001)).toThrow(expect.objectContaining({ code: 'INSUFFICIENT_AMOUNT' }));
  });

  it('비율 계산을 부동소수점 오차 없이 내림한다', () => {
    // 3000 * 0.29 는 JS 에서 869.9999999999999 → 그냥 내림하면 869 (1원 부족)
    expect(Math.floor(3000 * 0.29)).toBe(869);
    expect(Money.of(3000).percentFloor(0.29).toNumber()).toBe(870);
    expect(Money.of(1005).percentFloor(0.1).toNumber()).toBe(100);
  });

  it('잘못된 비율은 거부한다', () => {
    expect(() => Money.of(1000).percentFloor(1.5)).toThrow(expect.objectContaining({ code: 'INVALID_RATE' }));
    expect(() => Money.of(1000).percentFloor(-0.1)).toThrow(expect.objectContaining({ code: 'INVALID_RATE' }));
  });

  it('표기와 직렬화', () => {
    expect(Money.of(45000).format()).toBe('45,000원');
    expect(JSON.stringify({ amount: Money.of(45000) })).toBe('{"amount":45000}');
    expect(Money.of(3000).isMultipleOf(1000)).toBe(true);
    expect(Money.of(3500).isMultipleOf(1000)).toBe(false);
  });

  it('기본 수수료율(10%)에서는 기존 계산과 결과가 같다', () => {
    for (let amount = 0; amount <= 500000; amount += 500) {
      const { commission, payout } = calculateSettlement(amount, 0.1);
      expect(commission).toBe(Math.floor(amount / 10));
      expect(commission + payout).toBe(amount);
    }
  });
});
