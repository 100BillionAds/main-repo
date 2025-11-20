const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

// 3개의 테스트 계정 데이터
const testAccounts = [
  {
    username: 'test1234',
    password: '1234',
    name: '광고주',
    email: 'advertiser@10badv.com',
    role: 'user'
  },
  {
    username: 'design1234',
    password: '1234',
    name: '디자이너',
    email: 'designer@10badv.com',
    role: 'designer'
  },
  {
    username: 'admin',
    password: 'admin',
    name: '관리자',
    email: 'admin@10badv.com',
    role: 'admin'
  }
];

async function setupDatabase() {
  let connection;
  
  try {
    // MySQL 연결
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'merk'
    });

    console.log('✅ MySQL 연결 성공!');

    // 데이터베이스 생성 (이미 있으면 사용)
    await connection.query('CREATE DATABASE IF NOT EXISTS `10badv` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    console.log('✅ 데이터베이스 "10badv" 생성/확인 완료');

    // 데이터베이스 선택
    await connection.query('USE `10badv`');

    // users 테이블 생성
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        role ENUM('admin', 'user', 'designer') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ users 테이블 생성/확인 완료');

    // 기존 테스트 계정 삭제 (재실행 대비)
    for (const account of testAccounts) {
      await connection.query('DELETE FROM users WHERE username = ?', [account.username]);
    }
    console.log('✅ 기존 테스트 계정 삭제 완료 (재실행 대비)');

    // 테스트 계정 3개 생성
    console.log('\n📝 테스트 계정 생성 중...\n');
    
    for (const account of testAccounts) {
      const hashedPassword = await bcrypt.hash(account.password, 10);
      
      await connection.query(
        'INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)',
        [account.username, hashedPassword, account.name, account.email, account.role]
      );
      
      console.log(`✅ ${account.role} 계정 생성 완료:`);
      console.log(`   - 아이디: ${account.username}`);
      console.log(`   - 비밀번호: ${account.password}`);
      console.log(`   - 이름: ${account.name}`);
      console.log(`   - 역할: ${account.role}\n`);
    }

    // 생성된 계정 확인
    const [rows] = await connection.query('SELECT id, username, name, email, role, created_at FROM users ORDER BY id');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 현재 등록된 사용자 목록:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.username})`);
      console.log(`   역할: ${user.role}`);
      console.log(`   이메일: ${user.email}`);
      console.log(`   가입일: ${user.created_at}\n`);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 데이터베이스 설정 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔐 로그인 테스트 계정:');
    console.log('   1. 광고주  - test1234 / 1234');
    console.log('   2. 디자이너 - design1234 / 1234');
    console.log('   3. 관리자  - admin / admin\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('✅ MySQL 연결 종료');
    }
  }
}

// 스크립트 실행
setupDatabase();
