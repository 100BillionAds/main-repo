import { randomUUID } from 'node:crypto';
import { query } from '@/lib/db';

/**
 * 아웃박스 (Transactional Outbox)
 *
 * 문제: "DB 를 바꾸고 + 메시지 큐에 알린다"는 두 시스템에 걸친 작업이라 한 번에 성공시킬 수 없다.
 *   - DB 커밋 후 큐 전송이 실패하면 → 정산은 됐는데 아무도 모른다 (알림 누락)
 *   - 큐에 먼저 보내고 DB 가 롤백되면 → 일어나지 않은 일의 알림이 나간다
 *
 * 해법: 이벤트를 큐가 아니라 "같은 DB 의 테이블"에 먼저 적는다 (업무 변경과 한 트랜잭션).
 *   그러면 둘은 반드시 함께 커밋되거나 함께 롤백된다. 큐로 옮기는 일은 그 뒤에 따로, 될 때까지 한다.
 *
 * 이 테이블이 이벤트의 원본이다. 큐(Redis)는 날아가도 여기서 다시 보낼 수 있다.
 *
 * 한 행의 일생:  기록(enqueued_at = NULL) → 큐로 보냄(enqueued_at) → 처리 완료(processed_at)
 * 처리에 실패하면 attempts 가 오르고, 일정 시간 뒤 다시 보낸다. MAX_ATTEMPTS 를 넘으면 더 보내지 않는다.
 */
export const MAX_ATTEMPTS = 10;
const DEFAULT_REQUEUE_AFTER_SECONDS = 300;

function toEvent(row) {
  return {
    id: Number(row.id),
    type: row.event_type,
    aggregateType: row.aggregate_type,
    aggregateId: Number(row.aggregate_id),
    payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
    attempts: Number(row.attempts),
    processedAt: row.processed_at,
    createdAt: row.created_at,
  };
}

/** 이벤트를 적는다. 반드시 업무 변경과 같은 트랜잭션(connection)에서 호출한다. */
export async function append(connection, events) {
  for (const event of events) {
    await connection.execute(
      'INSERT INTO outbox_events (event_type, aggregate_type, aggregate_id, payload) VALUES (?, ?, ?, ?)',
      [event.type, event.aggregateType, event.aggregateId, JSON.stringify(event.payload)]
    );
  }
}

/**
 * 보낼 이벤트를 "내 것"으로 표시하고 가져온다.
 * 대상: 아직 처리되지 않았고, 한 번도 안 보냈거나 보낸 지 오래된(큐에서 유실됐을 수 있는) 것.
 *
 * UPDATE 한 문장으로 표시하므로 서버 여러 대가 동시에 실행해도 같은 행을 두 번 가져가지 않는다.
 * (SELECT 후 UPDATE 로 나누면 그 사이에 다른 서버가 같은 행을 읽는다)
 */
export async function claimBatch({ limit = 50, requeueAfterSeconds = DEFAULT_REQUEUE_AFTER_SECONDS } = {}) {
  const token = randomUUID();
  const batch = Math.max(1, Math.min(500, Math.floor(Number(limit)) || 50));

  const result = await query(
    `UPDATE outbox_events
        SET claim_token = ?, enqueued_at = NOW()
      WHERE processed_at IS NULL
        AND attempts < ?
        AND (enqueued_at IS NULL OR enqueued_at <= NOW() - INTERVAL ? SECOND)
      ORDER BY id
      LIMIT ${batch}`,
    [token, MAX_ATTEMPTS, Math.max(0, Math.floor(requeueAfterSeconds))]
  );
  if (!result.affectedRows) return [];

  const rows = await query('SELECT * FROM outbox_events WHERE claim_token = ? ORDER BY id', [token]);
  return rows.map(toEvent);
}

export async function findById(id) {
  const rows = await query('SELECT * FROM outbox_events WHERE id = ?', [id]);
  return rows[0] ? toEvent(rows[0]) : null;
}

export async function markProcessed(id) {
  await query('UPDATE outbox_events SET processed_at = NOW(), last_error = NULL WHERE id = ? AND processed_at IS NULL', [id]);
}

export async function markFailed(id, message) {
  await query('UPDATE outbox_events SET attempts = attempts + 1, last_error = ? WHERE id = ?', [
    String(message || 'unknown').slice(0, 500),
    id,
  ]);
}
