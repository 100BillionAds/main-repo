import * as outbox from '@/domain/events/outboxRepository';
import { handleNotificationEvent } from '@/domain/notifications/notificationHandlers';
import { enqueueOutboxEvent, getQueue, startWorker } from '@/lib/events/queue';

/**
 * 이벤트 버스: 아웃박스에 쌓인 이벤트를 소비자에게 전달한다.
 *
 *   업무 트랜잭션 ──(같은 트랜잭션)──▶ outbox_events
 *                                         │  relayOutbox(): 보낼 것을 가져와
 *                                         ▼
 *                              Redis 있음: 큐에 넣는다 ──▶ 워커 ──▶ 소비자(알림 ...)
 *                              Redis 없음/장애: 그 자리에서 소비자를 부른다
 *
 * 전달 보장은 "적어도 한 번(at-least-once)"이다. 유실은 없지만 같은 이벤트가 두 번 올 수 있다
 * (처리 직후 서버가 죽어 완료 표시를 못 한 경우 등). 그래서 소비자는 두 번 받아도 결과가 같도록(멱등) 만든다.
 */
const RELAY_INTERVAL_MS = 30000;

/** 이벤트를 듣는 소비자들. 후속 작업을 추가하려면 여기에 붙인다. */
const consumers = [handleNotificationEvent];

/**
 * 아웃박스 이벤트 하나를 처리한다 (워커와 즉시 처리 양쪽에서 사용).
 * 성공하면 완료로 표시하고, 실패하면 횟수를 올리고 예외를 다시 던진다 (큐가 재시도하도록).
 */
export async function processOutboxEvent(outboxId, { handlers = consumers, repository = outbox } = {}) {
  const event = await repository.findById(outboxId);
  if (!event || event.processedAt) return 'skipped';

  try {
    for (const handler of handlers) {
      await handler(event);
    }
    await repository.markProcessed(event.id);
    return 'processed';
  } catch (error) {
    await repository.markFailed(event.id, error?.message).catch(() => {});
    throw error;
  }
}

/**
 * 보낼 이벤트를 가져와 전달한다. 주기적으로, 그리고 업무 트랜잭션 직후에 실행된다.
 * @returns {Promise<{ claimed: number, queued: number, inline: number, failed: number }>}
 */
export async function relayOutbox({ limit = 50, requeueAfterSeconds, repository = outbox, handlers = consumers } = {}) {
  const events = await repository.claimBatch({ limit, requeueAfterSeconds });
  const summary = { claimed: events.length, queued: 0, inline: 0, failed: 0 };

  for (const event of events) {
    try {
      if (await enqueueOutboxEvent(event)) {
        summary.queued += 1;
        continue;
      }
    } catch (error) {
      console.error(`큐에 넣지 못해 바로 처리합니다 (outbox #${event.id}):`, error.message);
    }

    try {
      await processOutboxEvent(event.id, { handlers, repository });
      summary.inline += 1;
    } catch (error) {
      // 완료 표시가 안 됐으므로 requeueAfterSeconds 뒤에 다시 가져가게 된다.
      console.error(`이벤트 처리 실패 (outbox #${event.id}):`, error.message);
      summary.failed += 1;
    }
  }

  return summary;
}

let running = null;
let again = false;

/**
 * 릴레이를 깨운다 (기다리지 않는다). 업무 트랜잭션이 커밋된 직후에 호출해 지연을 줄인다.
 * 호출이 실패하거나 서버가 바로 죽어도 괜찮다 — 이벤트는 아웃박스에 있고 주기 실행이 가져간다.
 */
export function kickRelay() {
  // 테스트에서는 뒤에서 몰래 돌지 않게 한다. 테스트는 relayOutbox() 를 직접 호출한다.
  if (process.env.NODE_ENV === 'test') return;
  if (running) {
    again = true; // 도는 중에 새 이벤트가 생겼다. 끝나면 한 번 더 돈다.
    return;
  }
  running = relayOutbox()
    .catch((error) => console.error('이벤트 릴레이 실패:', error.message))
    .finally(() => {
      running = null;
      if (again) {
        again = false;
        kickRelay();
      }
    });
}

let started = false;

/** 서버 시작 시 한 번: 워커를 띄우고 주기 릴레이를 건다. */
export function startEventProcessing() {
  if (started) return;
  started = true;

  const worker = startWorker((outboxId) => processOutboxEvent(outboxId));
  console.warn(`📮 이벤트 처리 시작 (${worker ? '큐 워커' : '즉시 처리'}, 릴레이 ${RELAY_INTERVAL_MS / 1000}초 주기)`);

  // 서버가 꺼져 있던 동안 쌓인 이벤트를 먼저 내보낸다.
  kickRelay();
  const timer = setInterval(kickRelay, RELAY_INTERVAL_MS);
  timer.unref?.();
}

export { getQueue };
