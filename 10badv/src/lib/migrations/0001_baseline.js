/**
 * 0001_baseline — 마이그레이션 체계 도입 시점의 전체 스키마.
 *
 * 이전에는 initializeDatabase() 가 서버가 뜰 때마다 이 내용을 통째로 실행했다.
 * 모든 단계가 "없으면 만든다" 방식이라, 이미 테이블이 있는 운영 DB 에서도 그대로 통과하고
 * 적용 기록만 남는다. 빈 DB 에서는 전체 스키마를 만든다.
 *
 * ⚠️ 한 번 배포된 마이그레이션은 수정하지 않는다 (체크섬 불일치로 서버가 적용을 거부한다).
 *    스키마를 바꾸려면 0002_... 파일을 새로 추가한다.
 */

const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

const steps = [
  // ---- 테이블 ----
  `CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  role ENUM('admin', 'user', 'designer') DEFAULT 'user',
  avatar_url TEXT,
  bio TEXT,
  phone VARCHAR(20),
  points INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS portfolios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  designer_id INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  price INT DEFAULT 0,
  thumbnail_url TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (designer_id) REFERENCES users(id) ON DELETE CASCADE
) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS portfolio_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portfolio_id INT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id INT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100),
  budget INT DEFAULT 0,
  tags JSON,
  status ENUM('OPEN', 'MATCHED', 'COMPLETED', 'CANCELLED') DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS proposals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  designer_id INT NOT NULL,
  message TEXT,
  offer_price INT DEFAULT 0,
  status ENUM('PENDING', 'ACCEPTED', 'REJECTED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (designer_id) REFERENCES users(id) ON DELETE CASCADE
) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  portfolio_id INT,
  buyer_id INT NOT NULL,
  designer_id INT NOT NULL,
  proposal_id INT,
  amount INT DEFAULT 0,
  commission INT DEFAULT 0,
  status ENUM('pending', 'in_progress', 'awaiting_confirmation', 'completed', 'cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'points',
  payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  escrow_status ENUM('none', 'held', 'released', 'refunded') NOT NULL DEFAULT 'none',
  settled_by ENUM('buyer', 'designer', 'admin', 'auto') NULL,
  cancel_reason VARCHAR(255) NULL,
  started_at DATETIME NULL,
  submitted_at DATETIME NULL,
  auto_confirm_at DATETIME NULL,
  auto_cancel_at DATETIME NULL,
  completed_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (designer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL
) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS point_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('charge', 'use', 'earn', 'refund', 'withdraw') NOT NULL,
  amount INT NOT NULL,
  fee INT DEFAULT 0,
  balance_after INT DEFAULT 0,
  description TEXT,
  reference_type VARCHAR(50),
  reference_id INT,
  status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  merchant_uid VARCHAR(100) UNIQUE NOT NULL,
  imp_uid VARCHAR(100),
  order_name TEXT,
  amount INT NOT NULL,
  payment_method VARCHAR(50),
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  portfolio_id INT,
  pg_provider VARCHAR(50),
  pg_tid VARCHAR(100),
  card_name VARCHAR(50),
  fail_reason TEXT,
  cancel_reason TEXT,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL
) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  reviewer_id INT NOT NULL,
  designer_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (designer_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_review (transaction_id, reviewer_id)
) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS chat_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user1_id INT NOT NULL,
  user2_id INT NOT NULL,
  portfolio_id INT,
  transaction_id INT,
  payment_id INT,
  last_message TEXT,
  last_message_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT,
  message_type ENUM('text', 'image', 'file') DEFAULT 'text',
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INT,
  is_read TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ${TABLE_OPTIONS}`,
  `CREATE TABLE IF NOT EXISTS bug_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  page_url TEXT,
  screenshot_url TEXT,
  severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
  admin_note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ${TABLE_OPTIONS}`,

  // ---- 예전 스키마(에스크로 도입 전)에서 올라오는 DB 용 컬럼 보강 ----
  { addColumn: ['payments', 'order_name', 'TEXT'] },
  { addColumn: ['payments', 'fail_reason', 'TEXT'] },
  { addColumn: ['payments', 'cancel_reason', 'TEXT'] },
  {
    addColumn: ['transactions', 'escrow_status', "ENUM('none', 'held', 'released', 'refunded') NOT NULL DEFAULT 'none'"],
    // 컬럼을 처음 추가할 때 한 번만: 기존 거래의 에스크로 상태를 결제 상태에서 역산한다.
    // 포인트가 실제로 차감된 거래(payment_status = 'completed')만 보관(held)으로 본다.
    onAdded: [
      `UPDATE transactions
          SET escrow_status = CASE
                WHEN payment_status = 'refunded' THEN 'refunded'
                WHEN payment_status = 'completed' AND status = 'completed' THEN 'released'
                WHEN payment_status = 'completed' AND status = 'cancelled' THEN 'refunded'
                WHEN payment_status = 'completed' THEN 'held'
                ELSE 'none'
              END`,
    ],
  },
  { addColumn: ['transactions', 'settled_by', "ENUM('buyer', 'designer', 'admin', 'auto') NULL"] },
  { addColumn: ['transactions', 'cancel_reason', 'VARCHAR(255) NULL'] },
  { addColumn: ['transactions', 'started_at', 'DATETIME NULL'] },
  { addColumn: ['transactions', 'submitted_at', 'DATETIME NULL'] },
  { addColumn: ['transactions', 'auto_confirm_at', 'DATETIME NULL'] },
  { addColumn: ['transactions', 'auto_cancel_at', 'DATETIME NULL'] },
  { addColumn: ['transactions', 'completed_at', 'DATETIME NULL'] },
  { addColumn: ['transactions', 'cancelled_at', 'DATETIME NULL'] },

  // ---- 인덱스 ----
  { addIndex: ['users', 'idx_users_email', 'email'] },
  { addIndex: ['users', 'idx_users_role_status', 'role, status'] },
  { addIndex: ['users', 'idx_users_rating', 'rating'] },
  { addIndex: ['portfolios', 'idx_portfolios_designer_status', 'designer_id, status'] },
  { addIndex: ['portfolios', 'idx_portfolios_category', 'category'] },
  { addIndex: ['portfolios', 'idx_portfolios_status', 'status'] },
  { addIndex: ['portfolios', 'idx_portfolios_created', 'created_at'] },
  { addIndex: ['transactions', 'idx_transactions_buyer', 'buyer_id'] },
  { addIndex: ['transactions', 'idx_transactions_designer', 'designer_id'] },
  { addIndex: ['transactions', 'idx_transactions_status', 'status'] },
  { addIndex: ['transactions', 'idx_transactions_created', 'created_at'] },
  // 자동정산 대상 조회용
  { addIndex: ['transactions', 'idx_transactions_auto_confirm', 'status, auto_confirm_at'] },
  { addIndex: ['transactions', 'idx_transactions_auto_cancel', 'status, auto_cancel_at'] },
  { addIndex: ['reviews', 'idx_reviews_designer', 'designer_id'] },
  { addIndex: ['point_transactions', 'idx_point_tx_user_created', 'user_id, created_at'] },
  // 같은 결제/거래에 대해 같은 종류의 포인트 기록이 두 번 남지 않도록 하는 최후 방어선
  { addIndex: ['point_transactions', 'uniq_point_tx_reference', 'reference_type, reference_id, type'], unique: true },
  { addIndex: ['chat_rooms', 'idx_chat_rooms_user1', 'user1_id'] },
  { addIndex: ['chat_rooms', 'idx_chat_rooms_user2', 'user2_id'] },
  { addIndex: ['chat_messages', 'idx_chat_msg_room_created', 'room_id, created_at'] },
  { addIndex: ['chat_messages', 'idx_chat_msg_unread', 'room_id, sender_id, is_read'] },
  { addIndex: ['requests', 'idx_requests_status', 'status'] },
  { addIndex: ['requests', 'idx_requests_client', 'client_id'] },
  { addIndex: ['proposals', 'idx_proposals_request', 'request_id'] },
  { addIndex: ['proposals', 'idx_proposals_designer', 'designer_id'] },
  { addIndex: ['payments', 'idx_payments_user', 'user_id'] },
];

const migration = {
  id: '0001_baseline',
  description: '마이그레이션 도입 시점의 전체 스키마 (테이블 12개, 에스크로 컬럼, 인덱스)',
  steps,
};

export default migration;
