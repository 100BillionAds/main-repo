import { Money } from '@/domain/shared/Money';

/**
 * 에스크로 정책 (순수 함수 — DB 의존 없음)
 *
 * 용어 사전
 * | 한글        | 코드                  | 정의                                              |
 * |-------------|-----------------------|---------------------------------------------------|
 * | 에스크로    | escrow                | 구매자 포인트를 거래 완료 전까지 플랫폼이 보관     |
 * | 보관        | hold                  | 구매자 포인트를 차감해 거래에 묶어 두는 행위       |
 * | 정산        | release / settlement  | 보관금에서 수수료를 떼고 디자이너에게 지급         |
 * | 환불        | refund                | 보관금을 구매자에게 전액 돌려주는 행위             |
 * | 구매확정    | confirm               | 구매자가 결과물을 승인해 정산을 일으키는 행위      |
 * | 자동정산    | auto settlement       | 기한이 지나면 시스템이 대신 구매확정/취소하는 것   |
 */

export const TRANSACTION_STATUS = Object.freeze({
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

export const ESCROW_STATUS = Object.freeze({
  NONE: 'none',
  HELD: 'held',
  RELEASED: 'released',
  REFUNDED: 'refunded',
});

const S = TRANSACTION_STATUS;

const VALID_TRANSITIONS = Object.freeze({
  [S.PENDING]: [S.IN_PROGRESS, S.CANCELLED],
  [S.IN_PROGRESS]: [S.AWAITING_CONFIRMATION, S.CANCELLED],
  [S.AWAITING_CONFIRMATION]: [S.COMPLETED, S.IN_PROGRESS],
  [S.COMPLETED]: [],
  [S.CANCELLED]: [],
});

function readNumberEnv(name, fallback, { min, max }) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return fallback;
  return value;
}

/** 플랫폼 수수료율 (기본 10%) */
export function getCommissionRate() {
  return readNumberEnv('ESCROW_COMMISSION_RATE', 0.1, { min: 0, max: 0.5 });
}

/** 작업 완료 제출 후 구매자가 확정하지 않으면 자동 구매확정되기까지의 일수 (기본 7일) */
export function getAutoConfirmDays() {
  return Math.floor(readNumberEnv('ESCROW_AUTO_CONFIRM_DAYS', 7, { min: 1, max: 60 }));
}

/** 결제 후 디자이너가 작업을 시작하지 않으면 자동 취소·환불되기까지의 일수 (기본 7일) */
export function getAutoCancelDays() {
  return Math.floor(readNumberEnv('ESCROW_AUTO_CANCEL_DAYS', 7, { min: 1, max: 60 }));
}

export function isValidTransition(from, to) {
  return Boolean(VALID_TRANSITIONS[from]?.includes(to));
}

/**
 * 정산 금액 계산. 수수료는 원 단위 내림. 수수료 + 지급액은 항상 원금과 같다.
 * 비율 계산은 Money 가 정수로 처리한다 (부동소수점 오차로 1원이 틀리는 일을 막는다).
 * @param {number|Money} amount
 * @returns {{ commission: number, payout: number }}
 */
export function calculateSettlement(amount, rate = getCommissionRate()) {
  const total = Money.of(amount);
  const commission = total.percentFloor(rate);
  return { commission: commission.toNumber(), payout: total.minus(commission).toNumber() };
}

/**
 * 상태 전환 권한 검사.
 * @param {{ from: string, to: string, isBuyer: boolean, isDesigner: boolean, isAdmin: boolean }} input
 * @returns {{ status: number, message: string }|null} 거부 사유. 허용이면 null
 */
export function getTransitionDenial({ from, to, isBuyer, isDesigner, isAdmin }) {
  if (!isValidTransition(from, to)) {
    return { status: 400, message: '유효하지 않은 상태 전환입니다.' };
  }

  if (isAdmin) return null;

  const forbidden = (message) => ({ status: 403, message });

  if (to === S.IN_PROGRESS && from === S.PENDING && !isDesigner) {
    return forbidden('디자이너만 거래를 진행 중으로 변경할 수 있습니다.');
  }

  if (to === S.AWAITING_CONFIRMATION && !isDesigner) {
    return forbidden('디자이너만 작업 완료를 할 수 있습니다.');
  }

  if (from === S.AWAITING_CONFIRMATION && !isBuyer) {
    return forbidden(
      to === S.COMPLETED
        ? '광고주만 거래 완료 승인을 할 수 있습니다.'
        : '광고주만 수정 요청을 할 수 있습니다.'
    );
  }

  // 작업이 시작된 뒤에는 구매자가 일방적으로 취소해 환불받을 수 없다.
  if (to === S.CANCELLED && from === S.IN_PROGRESS && !isDesigner) {
    return forbidden('작업이 시작된 거래는 디자이너 또는 관리자만 취소할 수 있습니다.');
  }

  return null;
}
