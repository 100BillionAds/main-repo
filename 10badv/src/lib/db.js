import mysql from 'mysql2/promise';

// MySQL 연결 풀 생성
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'merk',
  database: '10badv',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 데이터베이스 연결 테스트 및 초기화
export async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL 연결 성공!');

    // users 테이블 생성 (없으면)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        role ENUM('admin', 'user', 'designer') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ users 테이블 확인/생성 완료');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error);
    return false;
  }
}

// 사용자 조회 (username으로)
export async function getUserByUsername(username) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('사용자 조회 오류:', error);
    return null;
  }
}

// 사용자 생성
export async function createUser({ username, password, name, email, role = 'user', avatar_url = null }) {
  try {
    const [result] = await pool.query(
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
    const [rows] = await pool.query('SELECT id, username, name, email, role, created_at FROM users ORDER BY created_at DESC');
    return rows;
  } catch (error) {
    console.error('사용자 목록 조회 오류:', error);
    return [];
  }
}

// 사용자 업데이트
export async function updateUser(userId, updates) {
  try {
    const fields = [];
    const values = [];
    
    if (updates.name) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.email) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.role) {
      fields.push('role = ?');
      values.push(updates.role);
    }
    
    if (fields.length === 0) return false;
    
    values.push(userId);
    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return true;
  } catch (error) {
    console.error('사용자 업데이트 오류:', error);
    return false;
  }
}

// 사용자 삭제
export async function deleteUser(userId) {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    return true;
  } catch (error) {
    console.error('사용자 삭제 오류:', error);
    return false;
  }
}

export default pool;
