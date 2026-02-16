import mysql from 'mysql2/promise';

// MySQL 연결 풀 생성 (환경변수 사용)
const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || '10badv',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// 풀에서 커넥션을 가져와 쿼리 실행하는 헬퍼 (자동 반환)
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// 트랜잭션이 필요한 경우 커넥션을 직접 가져오기
export async function getConnection() {
  return pool.getConnection();
}

// 데이터베이스 연결 테스트 및 초기화
export async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();

    // users 테이블 생성 (없으면)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // portfolios 테이블
    await connection.query(`
      CREATE TABLE IF NOT EXISTS portfolios (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // portfolio_images 테이블
    await connection.query(`
      CREATE TABLE IF NOT EXISTS portfolio_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        portfolio_id INT NOT NULL,
        image_url TEXT NOT NULL,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // requests 테이블
    await connection.query(`
      CREATE TABLE IF NOT EXISTS requests (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // proposals 테이블
    await connection.query(`
      CREATE TABLE IF NOT EXISTS proposals (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // transactions 테이블
    await connection.query(`
      CREATE TABLE IF NOT EXISTS transactions (
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL,
        FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (designer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // point_transactions 테이블
    await connection.query(`
      CREATE TABLE IF NOT EXISTS point_transactions (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // payments 테이블
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        merchant_uid VARCHAR(100) UNIQUE NOT NULL,
        imp_uid VARCHAR(100),
        amount INT NOT NULL,
        payment_method VARCHAR(50),
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        portfolio_id INT,
        pg_provider VARCHAR(50),
        pg_tid VARCHAR(100),
        card_name VARCHAR(50),
        paid_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // reviews 테이블
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reviews (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // chat_rooms 테이블
    await connection.query(`
      CREATE TABLE IF NOT EXISTS chat_rooms (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // chat_messages 테이블
    await connection.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // bug_reports 테이블 (오류 신고용)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bug_reports (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    connection.release();
    return true;
  } catch (error) {
    console.error('데이터베이스 초기화 실패:', error);
    return false;
  }
}

// 사용자 조회 (username으로)
export async function getUserByUsername(username) {
  try {
    const rows = await query('SELECT * FROM users WHERE username = ?', [username]);
    return rows[0] || null;
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    return null;
  }
}

// 이메일로 사용자 조회
export async function getUserByEmail(email) {
  try {
    const rows = await query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    return null;
  }
}

// 사용자 생성
export async function createUser({ username, password, name, email, role = 'user', avatar_url = null }) {
  try {
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, name, email, avatar_url, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, password, name, email, avatar_url, role]
    );
    return {
      id: result.insertId,
      username,
      name,
      email,
      avatar_url,
      role
    };
  } catch (error) {
    console.error('사용자 생성 오류:', error);
    throw error;
  }
}

// 모든 사용자 조회
export async function getAllUsers() {
  try {
    return await query('SELECT id, username, name, email, role, created_at FROM users ORDER BY created_at DESC');
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    return [];
  }
}

export default pool;
