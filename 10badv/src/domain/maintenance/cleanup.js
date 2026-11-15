import { query } from '@/lib/db';

/**
 * 정리 작업: 쓸모가 끝난 행을 지운다.
 *
 * 지우지 않으면 테이블이 끝없이 자란다. 무료 DB 는 용량 한도가 있고, 행이 많아지면 조회도 느려진다.
 * 한 번에 최대 BATCH 행만 지운다 — 한꺼번에 많이 지우면 그동안 잠금이 길게 잡힌다. 남은 것은 다음 실행에서 지운다.
 *
 * 돈의 기록(transactions, point_transactions, payments)은 지우지 않는다.
 */
const BATCH = 1000;

export const RETENTION_DAYS = Object.freeze({
  processedOutbox: 30, // 처리 끝난 이벤트: 장애 분석에 필요한 기간만
  readNotifications: 90, // 읽은 알림
  aiRequests: 180, // AI 사용 기록: 비용·품질 추세를 볼 기간
});

async function deleteOld(sql, days) {
  const result = await query(`${sql} LIMIT ${BATCH}`, [days]);
  return result.affectedRows || 0;
}

/** @returns {Promise<{ outbox: number, notifications: number, aiRequests: number }>} 지운 행 수 */
export async function runCleanup(retention = RETENTION_DAYS) {
  return {
    // 처리되지 않은 이벤트(processed_at IS NULL)는 아무리 오래돼도 지우지 않는다.
    outbox: await deleteOld(
      'DELETE FROM outbox_events WHERE processed_at IS NOT NULL AND processed_at < NOW() - INTERVAL ? DAY',
      retention.processedOutbox
    ),
    notifications: await deleteOld(
      'DELETE FROM notifications WHERE read_at IS NOT NULL AND read_at < NOW() - INTERVAL ? DAY',
      retention.readNotifications
    ),
    aiRequests: await deleteOld(
      'DELETE FROM ai_requests WHERE created_at < NOW() - INTERVAL ? DAY',
      retention.aiRequests
    ),
  };
}
