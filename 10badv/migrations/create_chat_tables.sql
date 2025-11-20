-- 채팅방 테이블
CREATE TABLE IF NOT EXISTS chat_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_id INT NULL COMMENT '결제 ID (결제 후 생성된 채팅방)',
  designer_id INT NOT NULL COMMENT '디자이너 ID',
  client_id INT NOT NULL COMMENT '고객/광고주 ID',
  portfolio_id INT NULL COMMENT '관련 포트폴리오 ID',
  last_message TEXT COMMENT '마지막 메시지',
  last_message_at DATETIME COMMENT '마지막 메시지 시간',
  is_active BOOLEAN DEFAULT TRUE COMMENT '활성 상태',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_payment (payment_id),
  INDEX idx_designer (designer_id),
  INDEX idx_client (client_id),
  INDEX idx_active (is_active),
  INDEX idx_last_message (last_message_at),
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL,
  FOREIGN KEY (designer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채팅방';

-- 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL COMMENT '채팅방 ID',
  sender_id INT NOT NULL COMMENT '발신자 ID',
  message_type ENUM('text', 'image', 'file') DEFAULT 'text' COMMENT '메시지 타입',
  content TEXT COMMENT '메시지 내용 (텍스트 또는 파일 경로)',
  file_url VARCHAR(500) COMMENT '파일/이미지 URL',
  file_name VARCHAR(255) COMMENT '원본 파일명',
  file_size INT COMMENT '파일 크기 (bytes)',
  is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
  read_at DATETIME COMMENT '읽은 시간',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room (room_id),
  INDEX idx_sender (sender_id),
  INDEX idx_created (created_at),
  INDEX idx_unread (is_read, room_id),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채팅 메시지';

-- 채팅 참여자 정보 (확장용)
CREATE TABLE IF NOT EXISTS chat_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL COMMENT '채팅방 ID',
  user_id INT NOT NULL COMMENT '사용자 ID',
  is_buyer BOOLEAN DEFAULT FALSE COMMENT '구매자 여부 (결제 완료한 사용자)',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '참여 시간',
  last_read_at DATETIME COMMENT '마지막 읽은 시간',
  unread_count INT DEFAULT 0 COMMENT '읽지 않은 메시지 수',
  UNIQUE KEY unique_participant (room_id, user_id),
  INDEX idx_user (user_id),
  INDEX idx_buyer (is_buyer),
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='채팅 참여자';

-- 채팅 이미지 업로드 디렉토리 생성 권한 필요
-- mkdir -p /Users/songdongjun/Desktop/main-repo/10badv/public/uploads/chat
-- chmod 755 /Users/songdongjun/Desktop/main-repo/10badv/public/uploads/chat
