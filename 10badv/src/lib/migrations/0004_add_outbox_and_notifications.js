/**
 * 0004_add_outbox_and_notifications — 이벤트 아웃박스와 알림.
 */
const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

const migration = {
  id: '0004_add_outbox_and_notifications',
  description: '도메인 이벤트 아웃박스(outbox_events), 알림(notifications)',
  steps: [
    `CREATE TABLE IF NOT EXISTS outbox_events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      event_type VARCHAR(100) NOT NULL,
      aggregate_type VARCHAR(50) NOT NULL,
      aggregate_id BIGINT NOT NULL,
      payload JSON NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      last_error VARCHAR(500) NULL,
      claim_token CHAR(36) NULL,
      enqueued_at DATETIME NULL,
      processed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ${TABLE_OPTIONS}`,
    // 릴레이가 "아직 처리 안 된 것"을 id 순으로 찾는다
    { addIndex: ['outbox_events', 'idx_outbox_pending', 'processed_at, id'] },
    { addIndex: ['outbox_events', 'idx_outbox_claim', 'claim_token'] },
    { addIndex: ['outbox_events', 'idx_outbox_aggregate', 'aggregate_type, aggregate_id'] },

    `CREATE TABLE IF NOT EXISTS notifications (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      type VARCHAR(100) NOT NULL,
      title VARCHAR(200) NOT NULL,
      body TEXT NULL,
      link VARCHAR(255) NULL,
      event_id BIGINT NULL,
      read_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ${TABLE_OPTIONS}`,
    // 같은 이벤트로 같은 사람에게 알림이 두 번 생기지 않게 한다 (소비자 멱등성의 근거)
    { addIndex: ['notifications', 'uniq_notifications_event_user', 'event_id, user_id'], unique: true },
    { addIndex: ['notifications', 'idx_notifications_user', 'user_id, id'] },
  ],
};

export default migration;
