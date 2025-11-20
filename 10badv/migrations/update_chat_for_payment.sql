-- 기존 chat_rooms 테이블에 결제 관련 컬럼 추가
ALTER TABLE chat_rooms 
ADD COLUMN payment_id INT NULL COMMENT '결제 ID (결제 후 생성된 채팅방)' AFTER id,
ADD INDEX idx_payment (payment_id),
ADD FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;

-- 기존 chat_messages 테이블에 파일 업로드 관련 컬럼 추가
ALTER TABLE chat_messages 
ADD COLUMN message_type ENUM('text', 'image', 'file') DEFAULT 'text' COMMENT '메시지 타입' AFTER message,
ADD COLUMN file_url VARCHAR(500) COMMENT '파일/이미지 URL' AFTER message_type,
ADD COLUMN file_name VARCHAR(255) COMMENT '원본 파일명' AFTER file_url,
ADD COLUMN file_size INT COMMENT '파일 크기 (bytes)' AFTER file_name;

-- 메시지 인덱스 추가 (성능 개선)
ALTER TABLE chat_messages
ADD INDEX idx_message_type (message_type),
ADD INDEX idx_created (created_at);
