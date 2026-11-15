import Redis from 'ioredis';
import { Queue, Worker } from 'bullmq';

/**
 * 메시지 큐 (BullMQ, Redis 기반)
 *
 * 큐는 "할 일 목록"이다. 넣는 쪽(생산자)은 넣고 바로 돌아가고, 꺼내는 쪽(워커)이 자기 속도로 처리한다.
 *  - 사용자 요청이 후속 작업(알림 등)을 기다리지 않는다.
 *  - 처리에 실패하면 간격을 늘려가며 자동으로 다시 시도한다.
 *  - 워커가 죽어도 할 일은 큐에 남는다.
 *
 * REDIS_URL 이 없으면 큐를 만들지 않는다 (null). 그때는 eventBus 가 그 자리에서 바로 처리한다.
 *
 * 연결은 캐시용(lib/redis.js)과 따로 둔다. 워커는 "일이 올 때까지 기다리는" 명령을 쓰므로
 * 캐시용의 짧은 제한 시간·재시도 설정과 맞지 않는다 (BullMQ 요구: maxRetriesPerRequest = null).
 */
export const QUEUE_NAME = 'tenbadv-events';

const JOB_OPTIONS = Object.freeze({
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 }, // 2초, 4초, 8초, 16초
  removeOnComplete: true,
  removeOnFail: { count: 200 }, // 끝내 실패한 작업은 원인 확인용으로 최근 200개만 남긴다
});

let connection = null;
let queue = null;
let worker = null;

function getConnection() {
  if (!process.env.REDIS_URL) return null;
  if (!connection) {
    connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    connection.on('error', () => {}); // 재연결은 ioredis 가 한다. 로그는 큐/워커의 error 이벤트에서 남긴다.
  }
  return connection;
}

export function getQueue() {
  const redis = getConnection();
  if (!redis) return null;
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: redis, defaultJobOptions: JOB_OPTIONS });
    queue.on('error', (error) => console.error('큐 오류:', error.message));
  }
  return queue;
}

/** 아웃박스 이벤트 하나를 처리할 일로 넣는다. jobId 가 같으면 한 번만 들어간다. */
export async function enqueueOutboxEvent(event) {
  const target = getQueue();
  if (!target) return false;
  // 시도 횟수를 붙여, 같은 회차의 중복 투입은 걸러지고 재투입(다음 회차)은 새 작업이 되게 한다.
  await target.add('outbox', { outboxId: event.id }, { jobId: `outbox-${event.id}-${event.attempts}` });
  return true;
}

/** 워커를 시작한다. 이미 시작했거나 Redis 가 없으면 아무것도 하지 않는다. */
export function startWorker(processOutboxId, { concurrency = 5 } = {}) {
  const redis = getConnection();
  if (!redis || worker) return worker;

  worker = new Worker(QUEUE_NAME, async (job) => processOutboxId(job.data.outboxId), {
    connection: redis,
    concurrency,
  });
  worker.on('error', (error) => console.error('워커 오류:', error.message));
  worker.on('failed', (job, error) => {
    const last = job && job.attemptsMade >= (job.opts.attempts || 1);
    console.error(`이벤트 처리 실패 (outbox #${job?.data?.outboxId}, ${job?.attemptsMade}회차${last ? ', 포기' : ''}):`, error.message);
  });
  return worker;
}

/** 테스트·종료 시 정리 */
export async function closeQueue() {
  const closing = [worker, queue];
  worker = null;
  queue = null;
  for (const item of closing) {
    if (item) await item.close().catch(() => {});
  }
  if (connection) {
    const redis = connection;
    connection = null;
    await redis.quit().catch(() => redis.disconnect());
  }
}
