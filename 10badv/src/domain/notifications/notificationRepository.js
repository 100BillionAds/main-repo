import { query } from '@/lib/db';

/**
 * 알림 저장소.
 * (event_id, user_id) 에 UNIQUE 가 걸려 있어, 같은 이벤트를 두 번 처리해도 알림은 한 번만 생긴다.
 */

/** @returns {Promise<boolean>} 새로 만들었으면 true, 이미 있어서 건너뛰었으면 false */
export async function createOnce({ userId, type, title, body, link, eventId }) {
  const result = await query(
    `INSERT IGNORE INTO notifications (user_id, type, title, body, link, event_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, type, title, body ?? null, link ?? null, eventId]
  );
  return result.affectedRows > 0;
}

export async function listForUser(userId, { limit = 30 } = {}) {
  const size = Math.max(1, Math.min(100, Math.floor(Number(limit)) || 30));
  return query(
    `SELECT id, type, title, body, link, read_at, created_at
       FROM notifications
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ${size}`,
    [userId]
  );
}

export async function countUnread(userId) {
  const rows = await query('SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND read_at IS NULL', [userId]);
  return Number(rows[0]?.cnt || 0);
}

export async function markAllRead(userId) {
  const result = await query('UPDATE notifications SET read_at = NOW() WHERE user_id = ? AND read_at IS NULL', [userId]);
  return result.affectedRows;
}
