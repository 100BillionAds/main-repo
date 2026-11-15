import { DomainError } from '@/domain/errors';
import { Money } from '@/domain/shared/Money';
import {
  ESCROW_STATUS,
  TRANSACTION_STATUS,
  calculateSettlement,
  getAutoConfirmDays,
  getTransitionDenial,
} from '@/domain/escrow/policy';

/**
 * Trade — 거래 엔티티 (에스크로 애그리거트의 루트)
 *
 * 엔티티(Entity)란: id 로 구별되고, 시간이 지나며 상태가 바뀌는 객체.
 * "거래가 어떤 상태에서 무엇을 할 수 있는가"라는 규칙을 전부 이 클래스가 가진다.
 *
 * 이 클래스는 DB 를 모른다.
 *  - 읽기/쓰기는 tradeRepository 가 한다.
 *  - 포인트를 실제로 옮기는 일은 escrowService 가 원장(ledger)에 시킨다.
 *  - 여기서는 상태를 바꾸고, "얼마를 누구에게 줘야 하는지"를 계산해 돌려줄 뿐이다.
 *
 * 그래서 DB 없이 단위 테스트로 모든 규칙을 검증할 수 있다.
 *
 * 시각은 DB 시계가 기준이다. 엔티티는 "지금", "N일 뒤" 라는 뜻만 남기고(dbNow, daysFromNow),
 * 저장소가 그것을 NOW(), DATE_ADD(NOW(), ...) 로 옮긴다. 서버와 DB 의 시계·시간대가 달라도 어긋나지 않는다.
 */

const S = TRANSACTION_STATUS;
const E = ESCROW_STATUS;

export const dbNow = Object.freeze({ kind: 'now' });
export const daysFromNow = (days) => Object.freeze({ kind: 'daysFromNow', days });

const ROLE_LABEL = Object.freeze({ buyer: '구매자', designer: '디자이너', admin: '관리자' });

function toId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export class Trade {
  #changes = {};

  constructor({ id, buyerId, designerId, amount, status, escrowStatus, paymentStatus, confirmDue, cancelDue }) {
    this.id = id;
    this.buyerId = buyerId;
    this.designerId = designerId;
    this.amount = Money.of(amount);
    this.status = status;
    this.escrowStatus = escrowStatus;
    this.paymentStatus = paymentStatus;
    this.confirmDue = Boolean(confirmDue);
    this.cancelDue = Boolean(cancelDue);
  }

  /** transactions 테이블의 행(+ 저장소가 계산한 confirm_due / cancel_due)으로부터 만든다. */
  static fromRow(row) {
    return new Trade({
      id: Number(row.id),
      buyerId: Number(row.buyer_id),
      designerId: Number(row.designer_id),
      amount: Number(row.amount),
      status: row.status,
      escrowStatus: row.escrow_status,
      paymentStatus: row.payment_status,
      confirmDue: Number(row.confirm_due) === 1,
      cancelDue: Number(row.cancel_due) === 1,
    });
  }

  get isEscrowHeld() {
    return this.escrowStatus === E.HELD;
  }

  /** 이 거래에서 actor 의 역할. 당사자가 아니면 null. 당사자 역할이 관리자보다 우선한다. */
  roleOf(actor) {
    const actorId = toId(actor?.id);
    if (actorId !== null && actorId === this.buyerId) return 'buyer';
    if (actorId !== null && actorId === this.designerId) return 'designer';
    if (actor?.role === 'admin') return 'admin';
    return null;
  }

  /**
   * 당사자(또는 관리자)의 요청으로 상태를 바꾼다.
   * @returns {{ commission?: number, payout?: number, refunded?: number }} 돈이 움직였다면 그 내역
   */
  changeStatus(actor, to) {
    const role = this.roleOf(actor);
    if (!role) {
      throw new DomainError('권한이 없습니다.', { status: 403 });
    }

    const denial = getTransitionDenial({
      from: this.status,
      to,
      isBuyer: role === 'buyer',
      isDesigner: role === 'designer',
      isAdmin: role === 'admin',
    });
    if (denial) {
      throw new DomainError(denial.message, { status: denial.status });
    }

    if (to === S.COMPLETED) return this.#release(role);
    if (to === S.CANCELLED) return this.#refund(role, `${ROLE_LABEL[role]} 취소`);
    if (to === S.AWAITING_CONFIRMATION) return this.#submitWork();
    return this.status === S.PENDING ? this.#startWork() : this.#requestRevision();
  }

  /** 자동 구매확정 대상인가: 작업 완료 제출 상태 + 보관 중 + 기한 경과 */
  get isAutoConfirmDue() {
    return this.status === S.AWAITING_CONFIRMATION && this.isEscrowHeld && this.confirmDue;
  }

  /** 자동 취소 대상인가: 디자이너 미착수 + 보관 중 + 기한 경과 */
  get isAutoCancelDue() {
    return this.status === S.PENDING && this.isEscrowHeld && this.cancelDue;
  }

  /** 기한이 지나 시스템이 대신 구매확정한다. */
  autoConfirm() {
    if (!this.isAutoConfirmDue) {
      throw new DomainError('자동 구매확정 대상이 아닙니다.', { status: 409, code: 'NOT_DUE' });
    }
    return this.#release('auto');
  }

  /** 디자이너가 기한 내 작업을 시작하지 않아 시스템이 취소·환불한다. */
  autoCancel() {
    if (!this.isAutoCancelDue) {
      throw new DomainError('자동 취소 대상이 아닙니다.', { status: 409, code: 'NOT_DUE' });
    }
    return this.#refund('auto', '디자이너 미착수 자동 취소');
  }

  /** 저장소가 UPDATE 할 변경분을 꺼내 간다 (꺼내면 비워진다). */
  pullChanges() {
    const changes = this.#changes;
    this.#changes = {};
    return changes;
  }

  #apply(changes) {
    if (changes.status !== undefined) this.status = changes.status;
    if (changes.escrowStatus !== undefined) this.escrowStatus = changes.escrowStatus;
    if (changes.paymentStatus !== undefined) this.paymentStatus = changes.paymentStatus;
    Object.assign(this.#changes, changes);
  }

  #startWork() {
    this.#apply({ status: S.IN_PROGRESS, startedAt: dbNow, autoCancelAt: null });
    return {};
  }

  #submitWork() {
    this.#apply({
      status: S.AWAITING_CONFIRMATION,
      submittedAt: dbNow,
      autoConfirmAt: daysFromNow(getAutoConfirmDays()),
      autoCancelAt: null,
    });
    return {};
  }

  #requestRevision() {
    this.#apply({ status: S.IN_PROGRESS, submittedAt: null, autoConfirmAt: null });
    return {};
  }

  /** 정산: 보관금에서 수수료를 떼고 나머지를 디자이너 몫으로 계산한다. 한 번 나간 돈은 다시 나가지 않는다. */
  #release(settledBy) {
    if (!this.isEscrowHeld) {
      throw new DomainError('보관 중인 에스크로 금액이 없어 정산할 수 없습니다.', {
        status: 409,
        code: 'ESCROW_NOT_HELD',
      });
    }

    const { commission, payout } = calculateSettlement(this.amount);
    this.#apply({
      status: S.COMPLETED,
      escrowStatus: E.RELEASED,
      commission,
      settledBy,
      completedAt: dbNow,
      autoConfirmAt: null,
      autoCancelAt: null,
    });
    return { commission, payout, settledBy };
  }

  /** 환불: 보관금이 있으면 구매자에게 전액 돌려준다. 보관금이 없는 거래는 상태만 취소로 바꾼다. */
  #refund(cancelledBy, reason) {
    const held = this.isEscrowHeld;
    const changes = {
      status: S.CANCELLED,
      settledBy: cancelledBy,
      cancelReason: reason || null,
      cancelledAt: dbNow,
      autoConfirmAt: null,
      autoCancelAt: null,
    };
    if (held) {
      changes.escrowStatus = E.REFUNDED;
      changes.paymentStatus = 'refunded';
    }
    this.#apply(changes);
    return { refunded: held ? this.amount.toNumber() : 0, reason: reason || null };
  }
}
