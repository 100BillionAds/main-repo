import { EVENT } from '@/domain/events/eventTypes';
import * as defaultNotifications from '@/domain/notifications/notificationRepository';

/**
 * 알림: 거래 이벤트를 듣고 당사자에게 알림을 만든다 (이벤트 소비자).
 *
 * 에스크로 코드는 알림이 있는지 모른다. 새 후속 작업(메일, 통계 ...)이 생기면
 * 에스크로를 건드리지 않고 이런 소비자를 하나 더 붙이면 된다.
 */
const won = (amount) => `${Number(amount || 0).toLocaleString('ko-KR')}원`;
const points = (amount) => `${Number(amount || 0).toLocaleString('ko-KR')}P`;

/**
 * 이벤트 하나가 누구에게 어떤 알림이 되는지 (순수 함수).
 * @returns {{ userId: number, title: string, body: string }[]}
 */
export function notificationsFor(event) {
  const p = event.payload || {};
  const label = `거래 #${p.tradeId}`;

  switch (event.type) {
    case EVENT.TRADE_CREATED:
      return [
        {
          userId: p.designerId,
          title: '새 주문이 들어왔습니다',
          body: `${p.title ? `"${p.title}" ` : ''}${won(p.amount)} 결제가 완료되어 대금이 보관 중입니다. ${p.autoCancelDays}일 안에 작업을 시작하지 않으면 자동으로 취소·환불됩니다.`,
        },
      ];

    case EVENT.TRADE_WORK_STARTED:
      return [{ userId: p.buyerId, title: '디자이너가 작업을 시작했습니다', body: `${label} 의 작업이 시작되었습니다.` }];

    case EVENT.TRADE_WORK_SUBMITTED:
      return [
        {
          userId: p.buyerId,
          title: '작업물이 제출되었습니다',
          body: `${label} 의 결과물을 확인하고 구매확정 또는 수정 요청을 해주세요. ${p.autoConfirmDays}일 안에 확정하지 않으면 자동으로 구매확정됩니다.`,
        },
      ];

    case EVENT.TRADE_REVISION_REQUESTED:
      return [{ userId: p.designerId, title: '수정 요청이 들어왔습니다', body: `${label} 에 대해 구매자가 수정을 요청했습니다.` }];

    case EVENT.TRADE_COMPLETED: {
      const auto = p.settledBy === 'auto';
      return [
        {
          userId: p.designerId,
          title: '정산이 완료되었습니다',
          body: `${label} ${auto ? '자동 구매확정' : '구매확정'}으로 ${points(p.payout)} 가 지급되었습니다 (수수료 ${won(p.commission)}).`,
        },
        {
          userId: p.buyerId,
          title: auto ? '자동으로 구매확정되었습니다' : '구매확정이 완료되었습니다',
          body: auto
            ? `${label} 은 기한 안에 확정되지 않아 자동으로 구매확정되었습니다.`
            : `${label} 이 완료되었습니다. 디자이너에게 리뷰를 남겨보세요.`,
        },
      ];
    }

    case EVENT.TRADE_CANCELLED: {
      const reason = p.reason ? ` (${p.reason})` : '';
      return [
        {
          userId: p.buyerId,
          title: '거래가 취소되었습니다',
          body:
            p.refunded > 0
              ? `${label} 이 취소되어 ${points(p.refunded)} 가 환불되었습니다${reason}.`
              : `${label} 이 취소되었습니다${reason}.`,
        },
        { userId: p.designerId, title: '거래가 취소되었습니다', body: `${label} 이 취소되었습니다${reason}.` },
      ];
    }

    default:
      return [];
  }
}

/** 이벤트를 받아 알림을 만든다. 같은 이벤트가 다시 와도 중복으로 만들지 않는다 (멱등). */
export async function handleNotificationEvent(event, notifications = defaultNotifications) {
  for (const item of notificationsFor(event)) {
    if (!Number.isSafeInteger(item.userId) || item.userId <= 0) continue;
    await notifications.createOnce({
      userId: item.userId,
      type: event.type,
      title: item.title,
      body: item.body,
      link: event.payload?.tradeId ? `/my-transactions/${event.payload.tradeId}` : null,
      eventId: event.id,
    });
  }
}
