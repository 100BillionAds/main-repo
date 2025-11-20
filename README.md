# 백억광고 (100BillionAds)

> 디자이너와 광고주를 연결하는 디자인 거래 플랫폼

## 📋 프로젝트 개요

백억광고는 디자이너가 자신의 포트폴리오를 등록하고, 광고주가 이를 구매하여 디자인 작업을 의뢰할 수 있는 B2B 디자인 거래 플랫폼입니다. 실시간 채팅, 포인트 결제 시스템, 에스크로 정산, 리뷰 시스템 등을 통합하여 안전하고 편리한 거래 환경을 제공합니다.

## 🚀 주요 기능

### 1. 사용자 관리
- **다중 역할 시스템**: 일반 사용자, 디자이너, 관리자
- **인증/인가**: NextAuth.js 기반 세션 관리
- **포인트 시스템**: 충전, 사용, 환불, 정산 내역 관리

### 2. 포트폴리오 관리
- 디자이너의 작품 업로드 및 관리
- 관리자 승인 시스템
- 카테고리별 필터링 및 검색
- 이미지 업로드 및 저장

### 3. 거래 시스템 (Transaction Flow)
**4단계 거래 프로세스:**
```
pending (결제대기)
  ↓ 디자이너: "진행 중" 버튼
in_progress (진행중)
  ↓ 디자이너: "작업 완료" 버튼
awaiting_confirmation (완료대기)
  ↓ 광고주: "거래 완료" 버튼
completed (거래완료) + 포인트 정산 + 채팅방 삭제
```

### 4. 실시간 채팅
- **Socket.io 기반** 실시간 메시징
- 텍스트, 이미지, 파일 전송
- 거래별 채팅방 자동 생성
- 읽음 표시 및 타이핑 인디케이터
- 거래 완료 시 자동 삭제

### 5. 결제 및 정산
- **포인트 기반 결제 시스템**
- **에스크로 방식**: 플랫폼이 거래 완료 전까지 포인트 보관
- 거래 완료 시 자동 정산
- 포인트 충전 (PortOne 연동 준비)

### 6. 리뷰 시스템
- 거래 완료 후 리뷰 작성
- 5점 만점 별점 시스템
- 디자이너별 **평균 별점 자동 계산**
- 중복 리뷰 방지

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 16.0.1 (App Router)
- **UI**: React 19.2.0
- **Styling**: CSS Modules + Tailwind CSS (Claymorphism 디자인)
- **Real-time**: Socket.io Client 4.8.1

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Authentication**: NextAuth.js 4.24.13
- **Real-time Server**: Socket.io 4.8.1
- **Database**: MySQL 8.0 (mysql2 라이브러리)

### Infrastructure
- **Database**: MySQL
- **File Storage**: 로컬 파일 시스템 (`/public/uploads`)
- **Session**: NextAuth.js (DB 세션)

## 📁 프로젝트 구조

```
10badv/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   ├── auth/             # NextAuth 인증
│   │   │   ├── chat/             # 채팅 API
│   │   │   ├── transactions/     # 거래 API
│   │   │   ├── reviews/          # 리뷰 API
│   │   │   ├── portfolios/       # 포트폴리오 API
│   │   │   ├── payments/         # 결제 API
│   │   │   └── points/           # 포인트 API
│   │   ├── (pages)/              # 페이지 컴포넌트
│   │   └── globals.css
│   ├── components/               # 재사용 컴포넌트
│   │   ├── designer/
│   │   └── portfolio/
│   └── features/                 # 기능별 모듈
│       └── chat/
├── public/
│   └── uploads/                  # 업로드 파일 저장소
├── server.js                     # Socket.io 서버
└── package.json
```

## 🔐 핵심 알고리즘 및 로직

### 1. 에스크로 포인트 정산 시스템

**목적**: 광고주와 디자이너 간의 안전한 거래를 보장

**알고리즘**:
```javascript
// 1. 거래 생성 시: 광고주 포인트 차감 (플랫폼 보관)
BEGIN TRANSACTION;
  UPDATE users SET points = points - amount WHERE id = buyer_id;
  INSERT INTO transactions (status='pending', ...);
COMMIT;

// 2. 거래 완료 시: 디자이너에게 포인트 지급
BEGIN TRANSACTION;
  UPDATE users SET points = points + amount WHERE id = designer_id;
  INSERT INTO point_transactions (type='earn', ...);
  UPDATE transactions SET status='completed';
  // 채팅방 삭제
  DELETE FROM chat_messages WHERE room_id IN (SELECT id FROM chat_rooms WHERE transaction_id = ?);
  DELETE FROM chat_rooms WHERE transaction_id = ?;
COMMIT;
```

**특징**:
- 트랜잭션으로 원자성 보장
- 거래 취소 시 포인트 환불 가능
- 모든 포인트 이동 내역 기록

### 2. 거래 상태 전환 검증

**목적**: 역할별 권한 제어 및 유효한 상태 전환만 허용

**상태 전환 규칙**:
```javascript
const validTransitions = {
  'pending': ['in_progress', 'cancelled'],
  'in_progress': ['awaiting_confirmation', 'cancelled'],
  'awaiting_confirmation': ['completed', 'in_progress'], // 수정 요청
  'completed': [],
  'cancelled': []
};

// 역할별 권한 검증
if (status === 'in_progress' && transaction.status === 'pending') {
  // 디자이너만 가능
  if (!isDesigner && !isAdmin) throw new Error('권한 없음');
}

if (status === 'awaiting_confirmation') {
  // 디자이너만 작업 완료 가능
  if (!isDesigner && !isAdmin) throw new Error('권한 없음');
}

if (status === 'completed' && transaction.status === 'awaiting_confirmation') {
  // 광고주만 최종 승인 가능
  if (!isBuyer && !isAdmin) throw new Error('권한 없음');
}
```

### 3. 리뷰 평균 별점 자동 계산

**목적**: 디자이너의 평판 관리

**알고리즘**:
```javascript
// 리뷰 작성 시 자동 계산
BEGIN TRANSACTION;
  // 1. 리뷰 저장
  INSERT INTO reviews (designer_id, rating, comment, ...);
  
  // 2. 평균 별점 계산
  SELECT AVG(rating) as avg_rating, COUNT(*) as review_count 
  FROM reviews WHERE designer_id = ?;
  
  // 3. 디자이너 프로필 업데이트
  UPDATE users 
  SET rating = avg_rating, review_count = review_count 
  WHERE id = designer_id;
COMMIT;
```

**특징**:
- 실시간 평균 계산
- 소수점 2자리까지 표시
- 중복 리뷰 방지 (transaction_id + reviewer_id UNIQUE)

### 4. 실시간 채팅 메시지 처리

**Socket.io 이벤트 흐름**:
```javascript
// 클라이언트 → 서버
socket.emit('send_message', {
  roomId,
  message,
  messageType: 'text|image|file',
  fileUrl,
  fileName,
  fileSize
});

// 서버 처리
io.on('connection', (socket) => {
  socket.on('send_message', async (data) => {
    // 1. DB 저장
    await connection.execute(
      'INSERT INTO chat_messages (room_id, sender_id, message, message_type, file_url, ...) VALUES (...)'
    );
    
    // 2. 채팅방 마지막 메시지 업데이트
    await connection.execute(
      'UPDATE chat_rooms SET last_message = ?, last_message_at = NOW() WHERE id = ?',
      [displayMessage, roomId]
    );
    
    // 3. 같은 방의 모든 사용자에게 브로드캐스트
    io.to(`room:${roomId}`).emit('new_message', messageData);
  });
});
```

### 5. 파일 업로드 처리

**멀티파트 파일 업로드**:
```javascript
// 1. 파일 수신 (formidable)
const form = formidable({
  uploadDir: './public/uploads',
  keepExtensions: true,
  maxFileSize: 10 * 1024 * 1024 // 10MB
});

// 2. 고유 파일명 생성
const timestamp = Date.now();
const randomStr = Math.random().toString(36).substring(7);
const ext = path.extname(file.originalFilename);
const newFileName = `${timestamp}-${randomStr}${ext}`;

// 3. 파일 이동 및 URL 생성
fs.renameSync(file.filepath, newPath);
const fileUrl = `/uploads/${newFileName}`;

// 4. DB 저장
await connection.execute(
  'UPDATE portfolios SET image_url = ? WHERE id = ?',
  [fileUrl, portfolioId]
);
```

## 🗄 데이터베이스 스키마

### 주요 테이블

#### users (사용자)
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  role ENUM('admin','user','designer') DEFAULT 'user',
  points INT DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,  -- 평균 별점
  review_count INT DEFAULT 0,         -- 총 리뷰 수
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### transactions (거래)
```sql
CREATE TABLE transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  portfolio_id INT NOT NULL,
  buyer_id INT NOT NULL,
  designer_id INT NOT NULL,
  amount INT NOT NULL,
  status ENUM('pending','in_progress','awaiting_confirmation','completed','cancelled'),
  payment_method VARCHAR(50),
  payment_status ENUM('pending','completed','failed'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id),
  FOREIGN KEY (buyer_id) REFERENCES users(id),
  FOREIGN KEY (designer_id) REFERENCES users(id)
);
```

#### chat_rooms (채팅방)
```sql
CREATE TABLE chat_rooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user1_id INT NOT NULL,
  user2_id INT NOT NULL,
  transaction_id INT,  -- 거래 연결
  last_message TEXT,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);
```

#### point_transactions (포인트 내역)
```sql
CREATE TABLE point_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  amount INT NOT NULL,
  type ENUM('charge','use','withdraw','refund','earn'),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 🔧 설치 및 실행

### 1. 환경 설정
```bash
# 프로젝트 클론
git clone https://github.com/100BillionAds/main-repo.git
cd main-repo/10badv

# 의존성 설치
npm install
```

### 2. 데이터베이스 설정
```bash
# MySQL 데이터베이스 생성
mysql -u root -p
CREATE DATABASE 10badv;

# 테이블 생성 (스키마 파일 실행)
mysql -u root -p 10badv < schema.sql
```

### 3. 환경 변수 설정
`.env.local` 파일 생성:
```env
# Database
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=10badv

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key

# PortOne (결제)
PORTONE_STORE_ID=your_store_id
PORTONE_API_KEY=your_api_key
```

### 4. 개발 서버 실행
```bash
npm run dev
# http://localhost:3000
```

## 📱 주요 화면

### 1. 홈페이지
- 최신 포트폴리오 6개 표시
- 인기 디자이너 6명 표시

### 2. 포트폴리오 목록
- 승인된 포트폴리오 그리드 뷰
- 구매 버튼 (자신의 포트폴리오는 구매 불가)

### 3. 거래 상세
- 4단계 Stepper UI
- 상태별 액션 버튼 (역할별 권한)
- 채팅 바로가기

### 4. 채팅
- 실시간 메시지
- 거래 상태 표시
- 파일 전송

### 5. 마이페이지
- 거래 내역 (구매자/판매자)
- 포인트 내역
- 리뷰 관리

## 🔒 보안 고려사항

### 1. 인증/인가
- 세션 기반 인증 (NextAuth.js)
- API 라우트별 권한 검증
- 역할 기반 접근 제어 (RBAC)

### 2. 데이터 검증
- 프론트엔드/백엔드 이중 검증
- SQL Injection 방지 (Prepared Statements)
- XSS 방지 (입력값 이스케이프)

### 3. 트랜잭션 안정성
- MySQL 트랜잭션으로 원자성 보장
- 에러 시 자동 롤백
- 포인트 이중 차감 방지 (FOR UPDATE 락)

## 🚧 향후 개발 계획

- [ ] PortOne 결제 연동 완료
- [ ] 알림 시스템 (Socket.io 활용)
- [ ] 포트폴리오 검색 및 필터링 고도화
- [ ] 채팅방 아카이빙 (삭제 대신 보관)
- [ ] 관리자 대시보드 통계 기능
- [ ] 디자이너 랭킹 시스템
- [ ] 쿠폰 및 프로모션 시스템

## 📄 라이선스

This project is private and proprietary.

## 👥 기여자

- **송동준** - Full Stack Developer

## 📞 문의

프로젝트 관련 문의: [GitHub Issues](https://github.com/100BillionAds/main-repo/issues)