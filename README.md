# 백억광고 (100BillionAds)

> 디자이너와 광고주를 연결하는 디자인 거래 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-16.0.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-blue?logo=react)](https://react.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8.1-010101?logo=socket.io)](https://socket.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)

## 📋 프로젝트 개요

백억광고는 디자이너가 자신의 포트폴리오를 등록하고, 광고주가 이를 구매하여 디자인 작업을 의뢰할 수 있는 B2B 디자인 거래 플랫폼입니다. 실시간 채팅, 포인트 결제 시스템, 에스크로 정산, 리뷰 시스템 등을 통합하여 안전하고 편리한 거래 환경을 제공합니다.

**v0.1.0** | 개발 진행 중 🚧

## 🚀 주요 기능

### 1. 사용자 관리
- **다중 역할 시스템**: 광고주(user), 디자이너(designer), 관리자(admin)
- **인증/인가**: NextAuth.js 기반 세션 관리
- **프로필 관리**: 프로필 사진 업로드, 자기소개, 회원정보 수정
- **포인트 시스템**: 충전, 사용, 환불, 정산 내역 관리

### 2. 포트폴리오 관리
- **디자이너 포트폴리오**: 작품 업로드 및 관리 (제목, 설명, 카테고리, 가격)
- **다중 이미지 업로드**: 포트폴리오당 여러 이미지 첨부 가능
- **관리자 승인 시스템**: pending → approved → 목록 노출
- **카테고리별 필터링**: 배너 디자인, 인스타그램 광고, 유튜브 썸네일 등 8개 카테고리
- **검색 및 정렬**: 키워드 검색, 가격순, 최신순 정렬
- **문의하기**: 포트폴리오에서 바로 디자이너와 채팅방 생성

### 3. 거래 시스템 (Transaction Flow)
**4단계 거래 프로세스:**
```
pending (결제대기)
  ↓ 광고주: 포인트로 구매 → 포인트 차감 (에스크로 보관)
in_progress (진행중)
  ↓ 디자이너: "작업 완료" 버튼
awaiting_confirmation (완료대기)
  ↓ 광고주: "거래 완료" 버튼 또는 "수정 요청" 버튼
completed (거래완료)
  → 디자이너 포인트 정산
  → 채팅방 및 메시지 자동 삭제
  → 리뷰 작성 가능
```

**거래 상태별 권한:**
- `pending → in_progress`: 디자이너만 가능
- `in_progress → awaiting_confirmation`: 디자이너만 가능
- `awaiting_confirmation → completed`: 광고주만 가능
- `awaiting_confirmation → in_progress`: 광고주만 가능 (수정 요청)
- `cancelled`: 관리자만 가능

### 4. 실시간 채팅
- **Socket.io 기반** 실시간 메시징
- **메시지 타입**: 텍스트, 이미지, 파일
- **거래별 채팅방**: 포트폴리오 문의하기 or 거래 생성 시 자동 생성
- **읽음 표시**: 메시지 읽음/안 읽음 상태 표시
- **타이핑 인디케이터**: 상대방이 입력 중일 때 표시
- **프로필 사진 표시**: 채팅방 목록 및 메시지에 프로필 사진 표시
- **메시지 좌우 구분**: 내 메시지는 오른쪽, 상대방 메시지는 왼쪽
- **거래 완료 시 자동 삭제**: 채팅방 및 메시지 히스토리 삭제

### 5. 결제 및 정산
- **포인트 기반 결제**: 실제 결제 없이 포인트로만 거래 (테스트용)
- **에스크로 방식**: 플랫폼이 거래 완료 전까지 포인트 보관
- **자동 정산**: 거래 완료 시 디자이너에게 포인트 자동 지급
- **포인트 충전**: 간편 충전 (금액 입력 → 즉시 충전)
- **포인트 내역**: 충전, 사용, 환불, 정산 내역 조회
- **잔액 부족 알림**: 포인트 부족 시 충전 페이지 안내

### 6. 리뷰 시스템
- **거래 완료 후 작성**: completed 상태 거래만 리뷰 가능
- **5점 만점 별점**: 1~5점 평가
- **평균 별점 자동 계산**: 디자이너별 평균 별점 및 리뷰 수 자동 업데이트
- **중복 방지**: 하나의 거래당 하나의 리뷰만 작성 가능
- **디자이너 프로필 표시**: 디자이너 목록 및 상세 페이지에 별점 표시

### 7. 디자이너 목록
- **디자이너 검색**: 이름, 소개글 검색
- **정렬**: 인기순(별점), 최신순, 완료율 높은 순
- **거래 통계**: 총 거래 수, 완료율, 평균 별점, 리뷰 수
- **프로필 사진**: 업로드된 프로필 사진 표시
- **상세 페이지**: 디자이너 정보, 포트폴리오 목록, 리뷰 목록

## 🛠 기술 스택

### Frontend
- **Framework**: Next.js 16.0.1 (App Router)
- **UI**: React 19.2.0
- **Styling**: CSS Modules + Tailwind CSS (Claymorphism 디자인)
- **Real-time**: Socket.io Client 4.8.1

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Next.js API Routes
- **Authentication**: NextAuth.js 4.24.13 (세션 기반)
- **Real-time Server**: Socket.io 4.8.1 (Custom Server)
- **Database**: MySQL 8.0 (mysql2 3.15.3)
- **Password Hashing**: bcrypt 6.0.0

### Infrastructure
- **Database**: MySQL 8.0
- **File Storage**: Local File System (`/public/uploads/`)
  - `/uploads/avatars/` - 프로필 사진
  - `/uploads/portfolios/` - 포트폴리오 이미지
- **Session Storage**: Database (NextAuth 세션 테이블)

## 📁 프로젝트 구조

```
10badv/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   │   ├── auth/             # NextAuth 인증 (로그인, 회원가입)
│   │   │   ├── chat/             # 채팅 API (rooms, messages)
│   │   │   ├── transactions/     # 거래 API (생성, 조회, 상태 변경)
│   │   │   ├── reviews/          # 리뷰 API (작성, 조회)
│   │   │   ├── portfolios/       # 포트폴리오 API (CRUD)
│   │   │   ├── designers/        # 디자이너 목록 API
│   │   │   ├── points/           # 포인트 API (충전, 조회)
│   │   │   ├── upload/           # 파일 업로드 API
│   │   │   └── users/            # 사용자 정보 API (프로필 조회/수정)
│   │   ├── (pages)/              # 페이지 컴포넌트
│   │   │   ├── chat/             # 채팅 페이지
│   │   │   ├── dashboard/        # 대시보드 (역할별)
│   │   │   ├── designers/        # 디자이너 목록/상세
│   │   │   ├── my-page/          # 마이페이지
│   │   │   ├── my-transactions/  # 내 거래 내역
│   │   │   ├── points/           # 포인트 충전/관리
│   │   │   ├── portfolios/       # 포트폴리오 목록
│   │   │   ├── profile/          # 프로필 편집
│   │   │   ├── transactions/     # 거래 현황 (관리자)
│   │   │   └── admin/            # 관리자 페이지
│   │   └── globals.css           # 글로벌 스타일
│   ├── components/               # 재사용 컴포넌트
│   │   ├── designer/             # 디자이너 관련 컴포넌트
│   │   ├── portfolio/            # 포트폴리오 관련 컴포넌트
│   │   ├── transaction/          # 거래 관련 컴포넌트
│   │   └── Header.js             # 공통 헤더
│   └── features/                 # 기능별 모듈
│       ├── chat/                 # 채팅 기능
│       │   └── components/
│       │       └── ChatInterface.js
│       └── portfolio/            # 포트폴리오 기능
│           └── components/
│               └── PortfolioBrowser.js
├── public/
│   └── uploads/                  # 업로드 파일 저장소
│       ├── avatars/              # 프로필 사진
│       └── portfolios/           # 포트폴리오 이미지
├── server.js                     # Socket.io 커스텀 서버
├── package.json
└── next.config.mjs
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

**목적**: 실시간 양방향 통신 및 메시지 영속성 보장

**처리 순서**: **DB 저장 우선 → 소켓 전송** (메시지 유실 방지)

**전체 알고리즘**:
```javascript
// ========== 1. 클라이언트: 메시지 전송 ==========
socket.emit('send_message', {
  roomId: 123,
  message: '안녕하세요',
  messageType: 'text', // 'text' | 'image' | 'file'
  fileUrl: null,       // 파일인 경우 URL
  fileName: null,
  fileSize: null
});

// ========== 2. 서버: 메시지 수신 및 처리 ==========
io.on('connection', (socket) => {
  // 2-1. 사용자 인증
  socket.on('authenticate', async (token) => {
    const session = await verifyToken(token);
    socket.userId = session.user.id;
    socket.userName = session.user.name;
  });

  // 2-2. 채팅방 입장
  socket.on('join_room', (roomId) => {
    socket.join(`room:${roomId}`);
    console.log(`사용자 ${socket.userId}가 방 ${roomId}에 입장`);
  });

  // 2-3. 메시지 전송 처리
  socket.on('send_message', async (data) => {
    const { roomId, message, messageType, fileUrl, fileName, fileSize } = data;
    
    try {
      // ★ STEP 1: DB 저장 (우선 실행)
      const connection = await mysql.createConnection(dbConfig);
      
      // 1-1. 메시지 삽입
      const [result] = await connection.execute(
        `INSERT INTO chat_messages 
         (room_id, sender_id, message, message_type, file_url, file_name, file_size, is_read, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, NOW())`,
        [roomId, socket.userId, message, messageType, fileUrl, fileName, fileSize]
      );
      
      const messageId = result.insertId;
      
      // 1-2. 채팅방 last_message 업데이트 (목록에서 최신 메시지 표시용)
      const displayMessage = messageType === 'text' 
        ? message 
        : messageType === 'image' 
          ? '📷 이미지' 
          : `📎 ${fileName}`;
      
      await connection.execute(
        `UPDATE chat_rooms 
         SET last_message = ?, last_message_at = NOW() 
         WHERE id = ?`,
        [displayMessage, roomId]
      );
      
      await connection.end();
      
      // ★ STEP 2: 소켓으로 브로드캐스트 (DB 저장 후)
      const messageData = {
        id: messageId,
        room_id: roomId,
        sender_id: socket.userId,
        sender_name: socket.userName,
        message,
        message_type: messageType,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        is_read: false,
        created_at: new Date().toISOString()
      };
      
      // 2-1. 같은 방의 모든 사용자에게 전송
      io.to(`room:${roomId}`).emit('new_message', messageData);
      
      // 2-2. 채팅방 목록 새로고침 (last_message 업데이트 반영)
      io.to(`room:${roomId}`).emit('room_updated', {
        roomId,
        last_message: displayMessage,
        last_message_at: new Date().toISOString()
      });
      
      console.log(`✅ 메시지 저장 및 전송 완료: Room ${roomId}, Message ID ${messageId}`);
      
    } catch (error) {
      console.error('❌ 메시지 처리 실패:', error);
      
      // 에러 발생 시 클라이언트에 알림
      socket.emit('message_error', {
        error: '메시지 전송에 실패했습니다.',
        roomId
      });
    }
  });

  // 2-4. 메시지 읽음 처리
  socket.on('mark_read', async ({ roomId, messageIds }) => {
    try {
      const connection = await mysql.createConnection(dbConfig);
      
      await connection.execute(
        `UPDATE chat_messages 
         SET is_read = TRUE 
         WHERE id IN (?) AND room_id = ? AND sender_id != ?`,
        [messageIds, roomId, socket.userId]
      );
      
      await connection.end();
      
      // 읽음 상태 브로드캐스트
      io.to(`room:${roomId}`).emit('messages_read', {
        messageIds,
        readBy: socket.userId
      });
      
    } catch (error) {
      console.error('읽음 처리 실패:', error);
    }
  });

  // 2-5. 타이핑 인디케이터
  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(`room:${roomId}`).emit('user_typing', {
      userId: socket.userId,
      userName: socket.userName,
      isTyping
    });
  });

  // 2-6. 연결 해제
  socket.on('disconnect', () => {
    console.log(`❌ 소켓 연결 해제: ${socket.userId}`);
  });
});

// ========== 3. 클라이언트: 메시지 수신 ==========
socket.on('new_message', (messageData) => {
  // UI에 메시지 추가
  setMessages(prev => [...prev, messageData]);
  
  // 스크롤을 맨 아래로
  scrollToBottom();
  
  // 상대방 메시지면 읽음 처리
  if (messageData.sender_id !== currentUserId) {
    socket.emit('mark_read', {
      roomId: messageData.room_id,
      messageIds: [messageData.id]
    });
  }
});

socket.on('messages_read', ({ messageIds }) => {
  // 읽음 상태 UI 업데이트
  setMessages(prev => 
    prev.map(msg => 
      messageIds.includes(msg.id) 
        ? { ...msg, is_read: true } 
        : msg
    )
  );
});

socket.on('user_typing', ({ userName, isTyping }) => {
  setTypingUser(isTyping ? userName : null);
});
```

**핵심 원칙**:
1. **DB 저장 우선**: 메시지를 먼저 DB에 저장하여 영속성 보장
2. **소켓은 알림용**: DB 저장 후 소켓으로 실시간 알림만 전송
3. **에러 처리**: DB 저장 실패 시 소켓 전송 안 함 (일관성 유지)
4. **트랜잭션 불필요**: 메시지는 개별 저장 (롤백할 필요 없음)

**장점**:
- 네트워크 오류 시에도 메시지 유실 방지
- 페이지 새로고침 시 DB에서 메시지 복원 가능
- 채팅방 목록의 last_message와 메시지 내용 동기화 보장

**처리 시간**:
- DB 저장: 평균 10~20ms
- 소켓 전송: 평균 5~10ms
- 총 처리 시간: 15~30ms (사용자가 느끼지 못할 정도로 빠름)

### 5. 파일 업로드 처리

**단일/다중 파일 업로드 API**:
```javascript
// API: /api/upload
// 파라미터: type (avatar | portfolio), file (단일), files (다중)

// 1. 단일 파일 (프로필 사진)
const formData = new FormData();
formData.append('file', file);
formData.append('type', 'avatar');
// 응답: { success: true, url: "/uploads/avatars/xxx.jpg" }

// 2. 다중 파일 (포트폴리오)
const formData = new FormData();
files.forEach(file => formData.append('files', file));
formData.append('type', 'portfolio');
// 응답: { success: true, urls: ["/uploads/portfolios/xxx.jpg", ...] }

// 3. 파일명 생성 (중복 방지)
const timestamp = Date.now();
const randomStr = Math.random().toString(36).substring(7);
const ext = path.extname(file.originalFilename);
const fileName = `${timestamp}-${randomStr}${ext}`;

// 4. 저장 경로
const uploadDir = type === 'avatar' 
  ? '/public/uploads/avatars' 
  : '/public/uploads/portfolios';
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
  phone VARCHAR(20),
  bio TEXT,                          -- 자기소개
  avatar_url VARCHAR(255),           -- 프로필 사진 URL
  role ENUM('admin','user','designer') DEFAULT 'user',
  points INT DEFAULT 0,              -- 보유 포인트
  rating DECIMAL(3,2) DEFAULT 0.00,  -- 평균 별점
  review_count INT DEFAULT 0,        -- 총 리뷰 수
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### portfolios (포트폴리오)
```sql
CREATE TABLE portfolios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  designer_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  price INT NOT NULL,
  thumbnail_url VARCHAR(255),        -- 대표 이미지
  images TEXT,                       -- JSON 배열 (다중 이미지)
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (designer_id) REFERENCES users(id)
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
  user1_id INT NOT NULL,             -- 첫 번째 사용자 (작은 ID)
  user2_id INT NOT NULL,             -- 두 번째 사용자 (큰 ID)
  portfolio_id INT,                  -- 문의 포트폴리오
  transaction_id INT,                -- 거래 연결
  last_message TEXT,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user1_id) REFERENCES users(id),
  FOREIGN KEY (user2_id) REFERENCES users(id),
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);
```

#### chat_messages (채팅 메시지)
```sql
CREATE TABLE chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  room_id INT NOT NULL,
  sender_id INT NOT NULL,
  message TEXT,
  message_type ENUM('text','image','file') DEFAULT 'text',
  file_url VARCHAR(255),
  file_name VARCHAR(255),
  file_size INT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);
```

#### point_transactions (포인트 내역)
```sql
CREATE TABLE point_transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('charge','use','withdraw','refund','earn') NOT NULL,
  amount INT NOT NULL,
  fee INT DEFAULT 0,
  balance_after INT NOT NULL,       -- 거래 후 잔액
  description TEXT,
  status ENUM('pending','completed','failed') DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### reviews (리뷰)
```sql
CREATE TABLE reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transaction_id INT NOT NULL,
  designer_id INT NOT NULL,
  reviewer_id INT NOT NULL,         -- 광고주
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_review (transaction_id, reviewer_id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (designer_id) REFERENCES users(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id)
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
CREATE DATABASE 10badv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 초기 데이터베이스 설정 API 호출 (테이블 자동 생성)
curl http://localhost:3000/api/init-point-system
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
NEXTAUTH_SECRET=your_secret_key_here

# PortOne (결제 - 선택사항)
NEXT_PUBLIC_PORTONE_STORE_ID=your_store_id
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=your_channel_key
PORTONE_API_SECRET=your_api_secret
```

### 4. 개발 서버 실행
```bash
npm run dev
# http://localhost:3000
```

### 5. 초기 관리자 계정 생성
```bash
# 회원가입 페이지에서 계정 생성 후 DB에서 role 변경
mysql -u root -p 10badv
UPDATE users SET role='admin' WHERE username='your_username';
```

## 📱 주요 화면 및 기능

### 1. 홈페이지 (`/`)
- 최신 포트폴리오 6개 카드 표시
- 인기 디자이너 6명 프로필 카드
- Claymorphism 디자인 스타일
- 반응형 그리드 레이아웃

### 2. 포트폴리오 목록 (`/portfolios`)
- 승인된 포트폴리오만 표시
- 카테고리별 필터링 (8개 카테고리)
- 키워드 검색 및 가격 필터
- 포트폴리오 카드: 이미지, 제목, 설명, 가격, 디자이너 정보
- **문의하기 버튼**: 디자이너와 1:1 채팅방 생성
- **구매하기 버튼**: 포인트로 즉시 구매

### 3. 디자이너 목록 (`/designers`)
- 프로필 사진, 이름, 평균 별점, 리뷰 수
- 거래 통계: 총 거래, 완료율
- 정렬: 인기순, 최신순, 완료율 순
- 디자이너 클릭 시 상세 페이지 이동

### 4. 디자이너 상세 페이지 (`/designers/[id]`)
- 디자이너 프로필 정보
- 포트폴리오 목록 (해당 디자이너)
- 리뷰 목록 및 평균 별점
- 문의하기 버튼

### 5. 거래 상세 (`/my-transactions/[id]`)
- **4단계 Stepper UI**: 결제대기 → 진행중 → 완료대기 → 거래완료
- 상태별 액션 버튼 (역할별 권한 체크)
- 포트폴리오 정보 표시
- 거래 상대방 정보
- 채팅 바로가기 버튼
- 리뷰 작성 버튼 (완료 시)

### 6. 채팅 (`/chat`)
- **채팅방 목록**: 최근 메시지 시간순 정렬, 안 읽은 메시지 수 배지
- **실시간 메시지**: Socket.io 기반
- **메시지 타입**: 텍스트, 이미지, 파일
- **프로필 사진**: 채팅방 목록 및 메시지에 표시
- **메시지 정렬**: 내 메시지 오른쪽, 상대방 메시지 왼쪽
- **타이핑 인디케이터**: 상대방이 입력 중일 때 표시
- **파일 전송**: 이미지, PDF, 문서 파일 전송 가능

### 7. 마이페이지 (`/my-page`)
- 프로필 정보 (이름, 이메일, 역할)
- 보유 포인트 표시
- 메뉴: 프로필 편집, 내 거래 내역, 포인트 충전, 내 포트폴리오 (디자이너)

### 8. 프로필 편집 (`/profile/edit`)
- 프로필 사진 업로드 (단일 파일)
- 이름, 이메일, 전화번호, 자기소개 수정
- 부분 업데이트 지원 (변경된 필드만 저장)

### 9. 포인트 충전 (`/points/charge`)
- 금액 입력 (최소 1,000원)
- 즉시 충전 버튼 (테스트용, 실제 결제 없음)
- 충전 내역 조회

### 10. 관리자 대시보드 (`/admin`)
- 포트폴리오 승인/거부
- 거래 현황 조회
- 사용자 관리
- 통계 대시보드

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
- 에러 시 자동 롤백 (BEGIN TRANSACTION ... COMMIT / ROLLBACK)
- 포인트 이중 차감 방지 (FOR UPDATE 락)
- 거래 상태 전환 검증 (유효한 상태 전환만 허용)

### 4. 파일 업로드 보안
- 최대 파일 크기 제한 (10MB)
- 허용된 파일 확장자만 업로드 (이미지, PDF, 문서)
- 고유 파일명 생성 (타임스탬프 + 랜덤 문자열)
- 폴더 분리 (avatars, portfolios)

## 🎨 디자인 시스템

### Claymorphism (클레이모피즘)
- **부드러운 3D 효과**: box-shadow를 활용한 입체감
- **파스텔 그라데이션**: 보라색 계열 (#667eea → #764ba2)
- **라운드 코너**: border-radius 15px~20px
- **글래스모피즘 요소**: 반투명 배경 + backdrop-filter

### 스타일링 전략
- **CSS Modules**: 컴포넌트별 스타일 격리
- **Tailwind CSS**: 유틸리티 클래스 (일부 페이지)
- **글로벌 스타일**: globals.css (공통 변수, 리셋)

## 🚧 향후 개발 계획

### 단기 (1개월)
- [ ] 포트원 실제 결제 연동
- [ ] 알림 시스템 (Socket.io 활용)
  - 새 메시지 알림
  - 거래 상태 변경 알림
  - 리뷰 작성 알림
- [ ] 포트폴리오 검색 고도화
  - 태그 시스템
  - 전문 검색 (Elasticsearch)
- [ ] 관리자 대시보드 통계
  - 일별/월별 거래 통계
  - 매출 차트
  - 사용자 증가 추이

### 중기 (3개월)
- [ ] 채팅방 아카이빙
  - 거래 완료 시 삭제 대신 보관
  - 완료된 거래 내역 조회
- [ ] 디자이너 랭킹 시스템
  - 주간/월간 베스트 디자이너
  - 카테고리별 랭킹
- [ ] 쿠폰 및 프로모션
  - 할인 쿠폰 발행
  - 이벤트 배너
- [ ] 포트폴리오 좋아요/북마크
  - 관심 포트폴리오 저장
  - 좋아요 수 기반 인기도

### 장기 (6개월+)
- [ ] AI 추천 시스템
  - 포트폴리오 추천
  - 디자이너 매칭
- [ ] 모바일 앱 (React Native)
- [ ] 다국어 지원 (i18n)
- [ ] 구독 멤버십 시스템
- [ ] 디자이너 인증 시스템
  - 포트폴리오 검증
  - 실력 테스트

## 📄 라이선스

This project is private and proprietary.

## 👥 팀 및 기여자

- **송동준** - Full Stack Developer & Product Owner
  - 프론트엔드 (Next.js, React)
  - 백엔드 (API Routes, Socket.io)
  - 데이터베이스 설계 (MySQL)
  - UI/UX 디자인 (Claymorphism)

## 📞 문의 및 지원

- **이슈 트래커**: [GitHub Issues](https://github.com/100BillionAds/main-repo/issues)
- **프로젝트 위키**: [GitHub Wiki](https://github.com/100BillionAds/main-repo/wiki)

## 📚 참고 문서

- [Next.js 공식 문서](https://nextjs.org/docs)
- [NextAuth.js 공식 문서](https://next-auth.js.org/)
- [Socket.io 공식 문서](https://socket.io/docs/)
- [MySQL 공식 문서](https://dev.mysql.com/doc/)

---

**Last Updated**: 2025년 1월 21일  
**Version**: 0.1.0  
**Status**: 🚧 개발 진행 중