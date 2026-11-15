/**
 * 0002_add_ai_requests — AI 호출 기록.
 * 프롬프트 원문·응답은 저장하지 않고, 누가·무엇을·얼마나 썼는지만 남긴다.
 */
const migration = {
  id: '0002_add_ai_requests',
  description: 'AI 호출 기록 테이블 (사용 한도, 비용·품질 추적)',
  steps: [
    `CREATE TABLE IF NOT EXISTS ai_requests (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      feature VARCHAR(50) NOT NULL,
      prompt_version VARCHAR(20) NOT NULL,
      provider VARCHAR(30) NULL,
      model VARCHAR(100) NULL,
      status ENUM('pending', 'success', 'error', 'rejected') NOT NULL DEFAULT 'pending',
      input_chars INT NULL,
      input_tokens INT NULL,
      output_tokens INT NULL,
      latency_ms INT NULL,
      error_code VARCHAR(50) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    { addIndex: ['ai_requests', 'idx_ai_requests_user_created', 'user_id, created_at'] },
  ],
};

export default migration;
