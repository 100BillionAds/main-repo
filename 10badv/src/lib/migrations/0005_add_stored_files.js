/**
 * 0005_add_stored_files — 업로드 파일을 DB 에 보관 (STORAGE_PROVIDER=db).
 * 외부 저장소 없이 시작하기 위한 방식이다. 파일 본문(data)은 목록 조회에 딸려 오지 않도록 이 테이블에만 둔다.
 */
const migration = {
  id: '0005_add_stored_files',
  description: '업로드 파일 보관 테이블 (stored_files)',
  steps: [
    `CREATE TABLE IF NOT EXISTS stored_files (
      id CHAR(36) NOT NULL PRIMARY KEY,
      object_key VARCHAR(255) NOT NULL,
      content_type VARCHAR(100) NOT NULL,
      size_bytes INT NOT NULL,
      data LONGBLOB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ],
};

export default migration;
