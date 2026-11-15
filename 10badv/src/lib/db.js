import mysql from 'mysql2/promise';
import migrations from './migrations/index.js';
import { runMigrations, readMigrationStatus } from './migrations/migrator.js';

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

/**
 * 스키마를 최신 상태로 맞춘다 (서버 시작 시 instrumentation.js 가 한 번 호출).
 * 아직 적용되지 않은 마이그레이션만 순서대로 실행한다. 자세한 규칙은 docs/MIGRATIONS.md 참고.
 */
export async function initializeDatabase() {
  try {
    const result = await runMigrations(pool, migrations);
    if (result.applied.length > 0) {
      console.warn(`🗄️  마이그레이션 ${result.applied.length}건 적용: ${result.applied.join(', ')}`);
    }
    return true;
  } catch (error) {
    console.error('데이터베이스 마이그레이션 실패:', error);
    return false;
  }
}

/** 적용된/대기 중인 마이그레이션 목록 (운영 점검용). */
export async function getMigrationStatus() {
  return readMigrationStatus(pool, migrations);
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
