import { DomainError } from '@/domain/errors';

/**
 * Money — 금액 값 객체 (원 단위 정수)
 *
 * 값 객체(Value Object)란: 식별자가 없고 "값이 같으면 같은 것"인 객체. 한 번 만들면 바뀌지 않는다.
 * 금액을 그냥 number 로 다루면 생기는 문제를 타입 하나로 막는다.
 *
 *  - 소수·음수·NaN 금액이 만들어지지 않는다 (만드는 순간 거부).
 *  - 빼기 결과가 음수가 되면 거부한다. "없는 돈"은 표현할 수 없다.
 *  - 비율 계산을 부동소수점으로 하지 않는다 (아래 percentFloor 참고).
 */

const BASIS_POINTS = 10000; // 1bp = 0.01%

function assertValidAmount(amount) {
  if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount < 0) {
    throw new DomainError('금액이 유효하지 않습니다.', { code: 'INVALID_AMOUNT' });
  }
}

export class Money {
  #amount;

  constructor(amount) {
    assertValidAmount(amount);
    this.#amount = amount;
    Object.freeze(this);
  }

  /** DB 에서 읽은 값(문자열일 수 있음)이나 숫자로부터 만든다. */
  static of(value) {
    if (value instanceof Money) return value;
    if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
      return new Money(Number(value.trim()));
    }
    return new Money(value);
  }

  static zero() {
    return new Money(0);
  }

  plus(other) {
    return new Money(this.#amount + Money.of(other).toNumber());
  }

  /** 결과가 음수면 거부한다. */
  minus(other) {
    const result = this.#amount - Money.of(other).toNumber();
    if (result < 0) {
      throw new DomainError('금액이 부족합니다.', { code: 'INSUFFICIENT_AMOUNT' });
    }
    return new Money(result);
  }

  /**
   * 이 금액의 rate 비율을 원 단위로 내림해 돌려준다. (예: 수수료 계산)
   *
   * 부동소수점 곱셈은 쓰지 않는다. JS 에서 1000 * 0.07 은 70.00000000000001,
   * 100 * 0.57 은 56.99999999999999 가 되어, 내림하면 1원이 틀릴 수 있다.
   * 비율을 bp(0.01% 단위) 정수로 바꾼 뒤 정수끼리 계산한다.
   */
  percentFloor(rate) {
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate < 0 || rate > 1) {
      throw new DomainError('비율이 유효하지 않습니다.', { code: 'INVALID_RATE' });
    }
    const basisPoints = Math.round(rate * BASIS_POINTS);
    return new Money(Math.floor((this.#amount * basisPoints) / BASIS_POINTS));
  }

  equals(other) {
    return other instanceof Money && other.toNumber() === this.#amount;
  }

  isZero() {
    return this.#amount === 0;
  }

  isGreaterThanOrEqual(other) {
    return this.#amount >= Money.of(other).toNumber();
  }

  isMultipleOf(unit) {
    return Number.isSafeInteger(unit) && unit > 0 && this.#amount % unit === 0;
  }

  toNumber() {
    return this.#amount;
  }

  /** 화면·내역용 표기. 예: "45,000원" */
  format() {
    return `${this.#amount.toLocaleString('ko-KR')}원`;
  }

  toJSON() {
    return this.#amount;
  }

  toString() {
    return this.format();
  }
}
