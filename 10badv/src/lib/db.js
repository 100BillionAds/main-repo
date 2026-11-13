import mysql from 'mysql2/promise';

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return value === true || value === 'true' || value === '1';
}

function buildSslConfig() {
  const sslEnabled = toBoolean(process.env.DATABASE_SSL, false);
  if (!sslEnabled) {
    return undefined;
  }

  const sslConfig = {
    rejectUnauthorized: toBoolean(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED, true)
  };

  if (process.env.DATABASE_SSL_CA) {
    sslConfig.ca = process.env.DATABASE_SSL_CA;
  }

  return sslConfig;
}

function buildDatabaseConfig() {
  const ssl = buildSslConfig();

  const baseConfig = {
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  };

  if (process.env.DATABASE_URL) {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    const databaseNameFromUrl = (databaseUrl.pathname || '').replace(/^\/+/, '');

    const configFromUrl = {
      host: databaseUrl.hostname || process.env.DATABASE_HOST || 'localhost',
      port: Number(databaseUrl.port || process.env.DATABASE_PORT || 3306),
      user: decodeURIComponent(databaseUrl.username || process.env.DATABASE_USER || 'root'),
      password: decodeURIComponent(databaseUrl.password || process.env.DATABASE_PASSWORD || ''),
      database: databaseNameFromUrl || process.env.DATABASE_NAME || '10badv'
    };

    if (ssl) {
      configFromUrl.ssl = ssl;
    }

    return {
      ...baseConfig,
      ...configFromUrl
    };
  }

  const configFromDiscreteEnv = {
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || '10badv'
  };

  if (ssl) {
    configFromDiscreteEnv.ssl = ssl;
  }

  return {
    ...baseConfig,
    ...configFromDiscreteEnv
  };
}

// MySQL 연결 풀 생성 (환경변수 사용)
const pool = mysql.createPool(buildDatabaseConfig());

// 풀에서 커넥션을 가져와 쿼리 실행하는 헬퍼 (자동 반환)
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows
}

// 트랜잭션이 필요한 경우 커넥션을 직접 가져오기
export async function getConnection() {
  return pool.getConnection();
}

/**
 * 트랜잭션 헬퍼: 커넥션 획득 → BEGIN → work(connection) → COMMIT.
 * work 가 예외를 던지면 ROLLBACK 하고 예외를 다시 던진다. 커넥션은 항상 반환된다.
 */
export async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
}

// 기존 테이블에 누락된 컬럼 보강. 새로 추가했으면 true 반환
async function ensureColumn(connection, tableName, columnName, ddl) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as cnt
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?`,
    [tableName, columnName]
  );
  if (Number(rows?.[0]?.cnt || 0) > 0) {
    return false;
  }
  await connection.query(ddl);
  return true;
}

// 인덱스가 없을 때만 생성 (MySQL 은 CREATE INDEX IF NOT EXISTS 를 지원하지 않는다)
async function ensureIndex(connection, tableName, indexName, columns, { unique = false } = {}) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) as cnt
       FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND index_name = ?`,
    [tableName, indexName]
  );
  if (Number(rows?.[0]?.cnt || 0) > 0) {
    return false;
  }
  await connection.query(
    `CREATE ${unique ? 'UNIQUE ' : ''}INDEX ${indexName} ON ${tableName}(${columns})`
  );
  return true;
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 기존 스키마 호환: 과거 테이블에 누락된 컬럼 보강
    await ensureColumn(connection, 'payments', 'order_name', 'ALTER TABLE payments ADD COLUMN order_name TEXT');
    await ensureColumn(connection, 'payments', 'fail_reason', 'ALTER TABLE payments ADD COLUMN fail_reason TEXT');
    await ensureColumn(connection, 'payments', 'cancel_reason', 'ALTER TABLE payments ADD COLUMN cancel_reason TEXT');

    // 에스크로 자동정산 컬럼 (기존 DB 업그레이드)
    const escrowStatusAdded = await ensureColumn(
      connection, 'transactions', 'escrow_status',
      "ALTER TABLE transactions ADD COLUMN escrow_status ENUM('none', 'held', 'released', 'refunded') NOT NULL DEFAULT 'none'"
    );
    await ensureColumn(connection, 'transactions', 'settled_by', "ALTER TABLE transactions ADD COLUMN settled_by ENUM('buyer', 'designer', 'admin', 'auto') NULL");
    await ensureColumn(connection, 'transactions', 'cancel_reason', 'ALTER TABLE transactions ADD COLUMN cancel_reason VARCHAR(255) NULL');
    await ensureColumn(connection, 'transactions', 'started_at', 'ALTER TABLE transactions ADD COLUMN started_at DATETIME NULL');
    await ensureColumn(connection, 'transactions', 'submitted_at', 'ALTER TABLE transactions ADD COLUMN submitted_at DATETIME NULL');
    await ensureColumn(connection, 'transactions', 'auto_confirm_at', 'ALTER TABLE transactions ADD COLUMN auto_confirm_at DATETIME NULL');
    await ensureColumn(connection, 'transactions', 'auto_cancel_at', 'ALTER TABLE transactions ADD COLUMN auto_cancel_at DATETIME NULL');
    await ensureColumn(connection, 'transactions', 'completed_at', 'ALTER TABLE transactions ADD COLUMN completed_at DATETIME NULL');
    await ensureColumn(connection, 'transactions', 'cancelled_at', 'ALTER TABLE transactions ADD COLUMN cancelled_at DATETIME NULL');

    if (escrowStatusAdded) {
      // 컬럼을 처음 추가할 때 한 번만: 기존 거래의 에스크로 상태를 결제 상태에서 역산한다.
      // 포인트가 실제로 차감된 거래(payment_status = 'completed')만 보관(held)으로 본다.
      await connection.query(`
        UPDATE transactions
           SET escrow_status = CASE
                 WHEN payment_status = 'refunded' THEN 'refunded'
                 WHEN payment_status = 'completed' AND status = 'completed' THEN 'released'
                 WHEN payment_status = 'completed' AND status = 'cancelled' THEN 'refunded'
                 WHEN payment_status = 'completed' THEN 'held'
                 ELSE 'none'
               END
      `);
    }

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

    // 성능 인덱스 추가 (IF NOT EXISTS로 안전하게)
    const indexConnection = await pool.getConnection();
    const indexes = [
      // users
      ['users', 'idx_users_email', 'email'],
      ['users', 'idx_users_role_status', 'role, status'],
      ['users', 'idx_users_rating', 'rating'],
      // portfolios
      ['portfolios', 'idx_portfolios_designer_status', 'designer_id, status'],
      ['portfolios', 'idx_portfolios_category', 'category'],
      ['portfolios', 'idx_portfolios_status', 'status'],
      ['portfolios', 'idx_portfolios_created', 'created_at'],
      // transactions
      ['transactions', 'idx_transactions_buyer', 'buyer_id'],
      ['transactions', 'idx_transactions_designer', 'designer_id'],
      ['transactions', 'idx_transactions_status', 'status'],
      ['transactions', 'idx_transactions_created', 'created_at'],
      // 자동정산 대상 조회용
      ['transactions', 'idx_transactions_auto_confirm', 'status, auto_confirm_at'],
      ['transactions', 'idx_transactions_auto_cancel', 'status, auto_cancel_at'],
      // reviews
      ['reviews', 'idx_reviews_designer', 'designer_id'],
      // point_transactions
      ['point_transactions', 'idx_point_tx_user_created', 'user_id, created_at'],
      // 같은 결제/거래에 대해 같은 종류의 포인트 기록이 두 번 남지 않도록 하는 최후 방어선
      ['point_transactions', 'uniq_point_tx_reference', 'reference_type, reference_id, type', { unique: true }],
      // chat_rooms
      ['chat_rooms', 'idx_chat_rooms_user1', 'user1_id'],
      ['chat_rooms', 'idx_chat_rooms_user2', 'user2_id'],
      // chat_messages
      ['chat_messages', 'idx_chat_msg_room_created', 'room_id, created_at'],
      ['chat_messages', 'idx_chat_msg_unread', 'room_id, sender_id, is_read'],
      // requests
      ['requests', 'idx_requests_status', 'status'],
      ['requests', 'idx_requests_client', 'client_id'],
      // proposals
      ['proposals', 'idx_proposals_request', 'request_id'],
      ['proposals', 'idx_proposals_designer', 'designer_id'],
      // payments
      ['payments', 'idx_payments_user', 'user_id'],
    ];
    for (const [tableName, indexName, columns, options] of indexes) {
      try {
        await ensureIndex(indexConnection, tableName, indexName, columns, options);
      } catch (e) {
        // 인덱스는 성능/방어용이므로 실패해도 서비스는 계속한다. 원인은 로그로 남긴다.
        console.error(`인덱스 생성 실패 (${indexName}):`, e.message);
      }
    }
    indexConnection.release();

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

// 테스트/스크립트 종료 시 커넥션 풀 정리
export async function closeDatabasePool() {
  try {
    await pool.end();
    return true;
  } catch (error) {
    console.error('DB 풀 종료 오류:', error);
    return false;
  }
}

export default pool;
