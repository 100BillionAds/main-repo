# 🚀 프로젝트 설계 명세서 (For AI & Copilot)

## 1. 프로젝트 개요 (Project Overview)

* **프로젝트 이름:** '백억광고'
* **한 줄 요약 (Elevator Pitch):** 간판업자가 디자이너의 포트폴리오를 보고 간판 디자인을 의뢰 할 수도 있고, 인터넷 쇼핑몰처럼 디자이너가 마켓에 자신의 포트폴리오와 가격을 올려놓으면 구매할 수 있는 웹 서비스
* **핵심 목표 (Problem to Solve):** 간판 업자들이 디자이너의 포트폴리오를 한눈에 볼 수 있고, 간판업자와 디자이너 간의 소통이 편리하게 진행될 수 있도록 한다. 업종별 매칭을 쉽게 돕는다.
* **대상 사용자 (Target Audience):** 디자이너가 없는 간판 자영업자, 프리랜서 디자이너, 간판업/디자인 겸업 개인사업자. 일반 사용자도 자유게시판을 통해 간판 제작을 의뢰할 수 있다.

---

## 2. 핵심 기능 (Core Features)

* **[Epic 1: (사용자 인증)]**
    * [Story: 사용자는 이메일, 전화번호, 비밀번호로 회원가입할 수 있다.]
    * [Story: 사용자는 로그인/로그아웃할 수 있다.]
    * [Story: 사용자는 구글/카카오 계정으로 소셜 로그인할 수 있다.]
    * [Story: 간판업자는 마이페이지에서 자신의 가게 이름, 프로필을 등록할 수 있다.]
    * [Story: 디자이너는 마이페이지에서 포트폴리오, 전문 분야, 디자인 사진을 등록할 수 있다.]
    * [Story: 사용자 프로필을 클릭하면 정보 보기, 채팅하기, 신고하기 기능이 나온다.]
* **[Epic 2: (거래 및 매칭)]**
    * [Story: 사용자는 키워드로 간판 업종, 디자이너, 포트폴리오를 검색할 수 있다.]
    * [Story: (마켓) 디자이너가 올린 포트폴리오 디자인을 간판업자가 바로 구매할 수 있다.]
    * [Story: (의뢰) 간판업자가 '디자인 의뢰글'(`Request`)을 올릴 수 있다.]
    * [Story: (제안) 디자이너가 '의뢰글'을 보고 '제안'(`Proposal`)을 보낼 수 있다.]
    * [Story: 간판업자는 받은 제안 중 하나를 '수락'하여 매칭을 성사시킨다.]
    * [Story: 모든 거래(구매, 의뢰)는 '아임포트' 결제 API를 사용한다.]
    * [Story: 결제 시 에스크로(플랫폼 대금 보관)가 적용된다.]
* **[Epic 3: (리뷰 및 평점)]**
    * [Story: 거래가 완료된 후, 디자이너와 간판업자는 서로에게 별점(1~5점)을 줄 수 있다.]
    * [Story: 거래에 대한 상세 리뷰를 남길 수 있다.]
* **[Epic 4: (추천 및 노출)]**
    * [Story: 메인 대시보드에서 최근 매칭이 성사된 작업들을 볼 수 있다.]
    * [Story: 우수 사용자(평점, 거래 수)가 상위에 노출된다.]
    * [Story: (수익모델) 광고 상품을 결제한 경우 상위에 노출될 수 있도록 한다.]
* **[Epic 5: (신고 및 분쟁)]**
    * [Story: 계약 불이행 등 문제 발생 시 관리자에게 신고(컴플레인)할 수 있다.]
    * [Story: 문제가 되는 사용자는 '블랙리스트'로 등록하여 관리한다.]
* **[Epic 6: (커뮤니티 - 자유게시판)]**
    * [Story: 사용자들이 자유롭게 소통할 수 있는 게시판을 만든다.]
    * [Story: 일반 사용자도 이곳에서 간판 제작 의뢰 글을 올릴 수 있다.]
    * [Story: 게시판은 글작성, 좋아요/싫어요, 댓글, 신고 기능이 존재한다.]
* **[Epic 7: (실시간 채팅)]**
    * [Story: 사용자 간의 1:1 연락은 앱 내부 메신저(Socket.IO)를 통해 진행한다.]
    * [Story: 사용자와 관리자 간의 1:1 문의도 앱 내부 메신저를 통해 진행한다.]
    * [Story: 채팅 시작 시 개인정보 보호에 대한 팝업을 띄운다.]
* **[Epic 8: (관리자 페이지)]**
    * [Story: 모든 거래 내역(정산 전/후)을 확인할 수 있다.]
    * [Story: 모든 게시글(포트폴리오, 의뢰글, 자유게시판)을 관리할 수 있다.]
    * [Story: 모든 게시글(포트폴리오, 의뢰글, 자유게시판)의 상태(거래 전, 거래중, 거래완료 등)를 확인할 수 있다.]
    * [Story: 신고 내역 및 블랙리스트를 관리하고 처리할 수 있다.]
* **[Epic 9: (푸시 알림)]**
    * [Story: (FCM) 새 채팅, 제안 수락, 거래 완료, 서버 오류 등 주요 상황에 대해 사용자에게 푸시 알림을 보낸다.]

---

## 3. 기술 스택 (Tech Stack)

* **언어 (Language):** **JavaScript**
* **핵심 프레임워크 (Core):** **Next.js** (프론트엔드와 백엔드 API Routes 모두 포함)
* **프론트엔드 (Frontend):**
    * React (Next.js)
    * **CSS:** **Tailwind CSS**
    * **상태 관리:** React Context (기본) 또는 **Zustand** (추천)
* **백엔드 (Backend):**
    * **Next.js API Routes**
    * **ORM:** **Sequelize** (MySQL 연결용)
    * **인증:** **Next-Auth** (소셜 로그인 및 세션 관리)
* **데이터베이스 (Database):** **MySQL** (RDBMS)
* **주요 API (External APIs):**
    * **로그인:** 네이버 로그인 API, 카카오 로그인 API (Next-Auth로 통합)
    * **결제:** **아임포트 결제 API**
    * **실시간 채팅:** **Socket.IO**
* **기타 (Cloud, CI/CD 등):**
    * **배포:** **Vercel**
    * **파일 저장소:** **AWS S3** (AWS SDK 사용)
    * **푸시:** **FCM(Firebase Cloud Messaging)**

---

## 4. 아키텍처 및 디렉토리 구조

* **아키텍처 스타일:** 기능(Feature) 기반 구조
* **(중요) 라우트 그룹:** `src/app` 디렉토리는 **Next.js 라우트 그룹 `( )`**을 사용하여 기능별로 파일을 정리합니다. 괄호 안의 이름은 실제 URL에 영향을 주지 않습니다.

* **디렉토리 구조 (예상):**
    ```
    src/
    ├─ app/                     # Next.js App Router
    │   ├─ (main)/              # [기능] 메인, 커뮤니티 등 공통 페이지
    │   │   ├─ page.js          # (URL: /) 메인 페이지
    │   │   ├─ community/
    │   │   │   └─ page.js      # (URL: /community) 자유게시판
    │   │   └─ layout.js        # (공통) 헤더, 사이드바가 포함된 메인 레이아웃
    │   │
    │   ├─ (auth)/              # [기능] 인증 (로그인/회원가입)
    │   │   ├─ login/
    │   │   │   └─ page.js      # (URL: /login)
    │   │   ├─ signup/
    │   │   │   └─ page.js      # (URL: /signup)
    │   │   └─ find-password/
    │   │       └─ page.js      # (URL: /find-password)
    │   │
    │   ├─ (portfolio)/         # [기능] 포트폴리오
    │   │   ├─ portfolios/
    │   │   │   ├─ page.js      # (URL: /portfolios) 포트폴리오 마켓 (리스트)
    │   │   │   └─ [id]/
    │   │   │       └─ page.js  # (URL: /portfolios/123) 포트폴리오 상세
    │   │   └─ requests/
    │   │       ├─ page.js      # (URL: /requests) 디자인 의뢰 리스트
    │   │       └─ [id]/
    │   │           └─ page.js  # (URL: /requests/123) 의뢰 상세
    │   │
    │   ├─ (dashboard)/         # [기능] 마이페이지, 채팅 등 (로그인 필요)
    │   │   ├─ mypage/
    │   │   │   └─ page.js      # (URL: /mypage)
    │   │   └─ chat/
    │   │       └─ page.js      # (URL: /chat)
    │   │
    │   ├─ (admin)/             # [기능] 관리자 페이지
    │   │   └─ admin/
    │   │       ├─ page.js      # (URL: /admin)
    │   │       └─ users/
    │   │           └─ page.js  # (URL: /admin/users)
    │   │
    │   ├─ api/                 # 백엔드 API 라우트
    │   │   ├─ auth/
    │   │   ├─ portfolios/
    │   │   └─ transactions/
    │   │
    │   └─ layout.js            # (필수) Root Layout (html, body 태그)
    │
    ├─ features/                # [UI 로직] 기능별 컴포넌트, 훅, 서비스
    │   ├─ auth/
    │   │   └─ components/      # (e.g., LoginForm.js)
    │   └─ portfolio/
    │       └─ components/      # (e.g., PortfolioCard.js)
    │
    ├─ shared/                  # [공용] 모든 곳에서 쓰는 UI
    │   ├─ components/
    │   │   ├─ layout/          # (e.g., Sidebar.js, Header.js)
    │   │   └─ ui/              # (e.g., Button.js, Card.js, Modal.js)
    │   ├─ hooks/
    │   └─ utils/
    │
    ├─ lib/                     # [설정] DB, Auth 등 외부 라이브러리
    │   ├─ db.js                # Sequelize 연결
    │   ├─ models/              # Sequelize 모델
    │   └─ auth.js              # Next-Auth 설정
    │
    └─ public/                  # 정적 파일
    ```

---

## 5. 핵심 데이터 모델 (Core Data Models)

### 🧍‍♂️ `User` (사용자)

* `id` (PK) — 고유 식별자
* `role` (Enum: `'designer' | 'signMaker' | 'user' | 'admin'`) — 사용자 역할
* `username` (String) — 닉네임
* `email` (String, Unique) — 이메일 주소 (로그인용)
* `password` (String) — 비밀번호 (암호화 저장)
* `phoneNumber` (String, Unique) — 연락처
* `profileImage` (String, nullable) — 프로필 이미지 경로
* `bio` (Text, nullable) — 간단한 소개글
* `ratingAverage` (Float, default 0) — 평균 평점
* `createdAt` (DateTime) — 생성일
* `updatedAt` (DateTime) — 수정일

> 설명:
> 모든 사용자를 포함한 공통 모델입니다. 로그인, 프로필, 평점 관리에 사용됩니다.

---

### 🎨 `Portfolio` (디자이너 포트폴리오)

* `id` (PK) — 고유 식별자
* `designerId` (FK → User.id) — 작성한 디자이너 ID
* `title` (String) — 포트폴리오 제목
* `description` (Text) — 상세 설명
* `price` (Number) — 판매 또는 참고 가격
* `tags` (Array<String>) — 업종 또는 스타일 태그
* `images` (Array<String>) — 디자인 이미지 URL 배열
* `createdAt` (DateTime) — 등록일

> 설명:
> 디자이너가 자신의 간판 디자인 결과물과 가격을 등록합니다.

---

### 🧾 `Request` (의뢰글 / 구매글)

* `id` (PK) — 고유 식별자
* `clientId` (FK → User.id) — 의뢰자 ID
* `title` (String) — 글 제목
* `description` (Text) — 상세 설명
* `category` (String) — 업종 카테고리
* `budget` (Number) — 예산 금액
* `status` (Enum: `'OPEN' | 'MATCHED' | 'COMPLETED' | 'CANCELLED'`) — 진행 상태
* `tags` (Array<String>) — 검색 태그
* `createdAt` (DateTime) — 등록일

> 설명:
> 간판업자가 디자인을 의뢰하고 싶은 글을 올립니다.

---

### 💡 `Proposal` (디자이너 제안)

* `id` (PK) — 고유 식별자
* `requestId` (FK → Request.id) — 연결된 의뢰글 ID
* `designerId` (FK → User.id) — 제안한 디자이너 ID
* `message` (Text) — 제안 메시지
* `offerPrice` (Number) — 제안 가격
* `status` (Enum: `'PENDING' | 'ACCEPTED' | 'REJECTED'`) — 수락 상태
* `createdAt` (DateTime) — 제안일

> 설명:
> 'OPEN' 상태의 `Request`에 디자이너들이 제안을 보내는 모델입니다. 간판업자가 이 중 하나를 'ACCEPTED'로 변경하면 매칭이 성사됩니다.

---

### 💳 `Transaction` (거래 / 결제 내역)

* `id` (PK) — 고유 식별자
* `buyerId` (FK → User.id) — 구매자 ID (간판업자)
* `sellerId` (FK → User.id) — 판매자 ID (디자이너)
* `portfolioId` (nullable, FK → Portfolio.id) — (포트폴리오 바로 구매 시)
* `proposalId` (nullable, FK → Proposal.id) — (의뢰글 매칭 시)
* `amount` (Number) — 결제 금액
* `commission` (Number) — 플랫폼 수수료
* `paymentStatus` (Enum: `'PENDING' | 'HELD' | 'PAID' | 'REFUNDED'`) — 결제 상태
* `paymentMethod` (String) — 결제 수단 (e.g., 카드, 카카오페이 등)
* `createdAt` (DateTime) — 거래 생성일

> 설명:
> 아임포트 결제 API로 처리된 거래 내역입니다. `HELD`는 에스크로(대금 보관) 상태를 의미합니다.

---

### 🌟 `Review` (리뷰 & 별점)

* `id` (PK) — 고유 식별자
* `writerId` (FK → User.id) — 리뷰 작성자 ID
* `targetId` (FK → User.id) — 리뷰 대상 ID
* `transactionId` (FK → Transaction.id) — 연결된 거래 ID
* `rating` (Number, 1~5) — 평점
* `content` (Text) — 리뷰 내용
* `createdAt` (DateTime) — 작성일

> 설명:
> 거래가 완료된 후 서로에게 별점과 리뷰를 남깁니다.

---

### 💎 `Membership` (멤버십)

* `id` (PK) — 고유 식별자
* `userId` (FK → User.id, Unique) — 사용자 ID
* `tier` (Enum: `'NONE' | 'STANDARD' | 'VIP'`) — 멤버십 등급
* `startDate` (DateTime) — 등급 시작일
* `endDate` (DateTime, nullable) — 등급 만료일
* `updatedAt` (DateTime) — 수정일

> 설명:
> 디자이너의 수수료(20%, 15%, 10%)를 결정하기 위한 등급 모델입니다.

---

### 💰 `UserWallet` (포인트 지갑)

* `id` (PK) — 고유 식별자
* `userId` (FK → User.id, Unique) — 지갑 소유자 ID
* `balance` (Number, default 0) — 현재 포인트 잔액
* `updatedAt` (DateTime) — 최종 변경일

> 설명:
> 사용자의 포인트 잔액을 관리합니다. (환불 정책용)

---

### 📜 `PointHistory` (포인트 내역)

* `id` (PK) — 고유 식별자
* `walletId` (FK → UserWallet.id) — 연결된 지갑 ID
* `amount` (Number) — 변경된 포인트 (e.g., `+10000` 또는 `-5000`)
* `reason` (String) — 변경 사유 (e.g., "거래 #123 환불", "이벤트 참여")
* `transactionId` (nullable, FK → Transaction.id) — (환불 시 연결된 거래)
* `createdAt` (DateTime) — 생성일

> 설명:
> 포인트가 왜 변경되었는지 모든 내역을 기록하여 추적(auditing)합니다.

---

### 🚫 `Blacklist` (블랙리스트 / 신고내역)

* `id` (PK) — 고유 식별자
* `reportedUserId` (FK → User.id) — 신고된 사용자 ID
* `reporterId` (FK → User.id) — 신고한 사용자 ID
* `reason` (Text) — 신고 사유
* `status` (Enum: `'PENDING' | 'APPROVED' | 'REJECTED'`) — 처리 상태
* `createdAt` (DateTime) — 신고일

> 설명:
> 문제 사용자 신고 및 블랙리스트 등록 관리용입니다.

---

### 💬 `ChatRoom` (채팅방)

* `id` (PK) — 고유 식별자
* `user1Id` (FK → User.id) — 채팅 참여자 1
* `user2Id` (FK → User.id) — 채팅 참여자 2
* `createdAt` (DateTime) — 생성일

---

### 💭 `Message` (채팅 메시지)

* `id` (PK) — 고유 식별자
* `chatRoomId` (FK → ChatRoom.id) — 속한 채팅방 ID
* `senderId` (FK → User.id) — 보낸 사람 ID
* `content` (Text) — 메시지 내용
* `isRead` (Boolean, default false) — 읽음 여부
* `createdAt` (DateTime) — 보낸 시각

---

### 📰 `BoardPost` (자유게시판 글)

* `id` (PK) — 고유 식별자
* `authorId` (FK → User.id) — 작성자 ID
* `title` (String) — 게시글 제목
* `content` (Text) — 게시글 내용
* `likes` (Number, default 0) — 좋아요 수
* `dislikes` (Number, default 0) — 싫어요 수
* `createdAt` (DateTime) — 작성일

---

### 💬 `BoardComment` (자유게시판 댓글)

* `id` (PK) — 고유 식별자
* `postId` (FK → BoardPost.id) — 연결된 게시글 ID
* `authorId` (FK → User.id) — 작성자 ID
* `content` (Text) — 댓글 내용
* `createdAt` (DateTime) — 작성일

---

## 6. 비즈니스 로직, 정책 및 규칙

### 6.1. 핵심 정책
* **결제 (에스크로):** 간판업자 결제 시 `Transaction`은 `'HELD'`(보관중) 상태가 됨. '거래 완료' 승인 시 `paymentStatus`가 `'PAID'`(지급됨)로 변경되고 디자이너에게 정산됨.
* **수수료:** `Transaction`의 `commission`은 `Membership` 등급('NONE': 20%, 'STANDARD': 15%, 'VIP': 10%)에 따라 계산됨.
* **환불:** 환불은 `UserWallet`의 '포인트'로 지급됨.

### 6.2. 접근 제어 (Access Control)
* **`Guest` (비로그인):** 글 읽기만 가능.
* **`User` (로그인):** 채팅, 구매, 의뢰, 글쓰기 가능.
* **`designer` (역할):** `Portfolio` 생성 가능. `Proposal` 생성 가능.
* **`signMaker` (역향):** `Request` 생성 가능. `Proposal` 수락 가능.
* **`admin` (역할):** Epic 8의 모든 관리 기능 수행.

### 6.3. 데이터 유효성 검사 (Validation Rules)
* `User.username`: 최소 2자, 최대 15자, 중복 불가.
* `User.password`: 최소 8자, 영문/숫자/특수문자 1개씩 포함.
* `Portfolio.images`: 최대 10개까지 업로드, 개당 10MB 제한.
* `Request.budget`: 0원 이상.

---

## 7. 예외 처리 정책 (Error Handling)

* **인증 오류 (401):** 로그인이 필요한 기능(채팅, 구매)에 비로그인 사용자가 접근 시 "로그인이 필요합니다." 알림.
* **인가 오류 (403):** '간판업자'가 '포트폴리오' 등록 시도 시 "권한이 없습니다." 알림.
* **유효성 검사 오류 (400):** 회원가입 시 비밀번호 규칙 위반 시 "비밀번호는 8자 이상..." 알림.
* **사용자측 오류 (4xx):** 이미지 업로드 실패(용량 초과), 결제 실패(잔액 부족) 시 -> 사용자에게 명확한 알림창 표시.
* **서버측 오류 (5xx):** DB 연결 실패, API 로직 오류 시 -> 즉시 관리자에게 알림(FCM) 발송 및 오류 로그 기록.

## 8. 핵심 알고리즘 구현 (Core Algorithm Implementation)

단순 CRUD를 넘어 서비스의 핵심 경쟁력이 될 복잡한 로직과 알고리즘을 정의합니다.

### 8.1. 🥇 '우수 사용자' 랭킹 알고리즘 (Epic 4)

**목표:** "우수 사용자들이 상위에 노출 되도록 한다."
**알고리즘:** **가중치 기반 랭킹 알고리즘 (Weighted Scoring Algorithm)**
**설명:**
사용자의 신뢰도를 측정하기 위한 '종합 점수(Trust Score)'를 계산합니다. 이 점수는 단순 평균 별점이 아니라, 여러 요소를 가중 합산하여 계산합니다.

**입력 변수 (Input Variables):**
1.  **평균 별점:** `User.ratingAverage` (1.0 ~ 5.0)
2.  **거래 완료 수:** `Transaction` 테이블에서 `sellerId` 또는 `buyerId`로 카운트 (`paymentStatus` = 'PAID')
3.  **멤버십 등급:** `Membership.tier` ('VIP' = 30점, 'STANDARD' = 15점, 'NONE' = 0점)
4.  **신고/패널티:** `Blacklist` 테이블에 `reportedUserId`로 등록된 횟수 (건당 -50점)

**예시 로직 (Pseudo-Code):**
**적용:** 사용자 검색, 추천 리스트 API 호출 시 `ORDER BY score DESC` 쿼리를 통해 상위에 노출시킵니다.

---

### 8.2. 🔎 '게시판' 검색 알고리즘 (Epic 2)

**목표:** "키워드로 간판 업종을 검색할 수 있다." (포트폴리오, 의뢰글 포함)
**문제:** `LIKE '%검색어%'` 쿼리는 데이터가 많아지면 매우 느리고 부정확합니다.
**알고리즘:** **풀 텍스트 검색 (Full-Text Search) 알고리즘**

**구현:**
1.  **DB 최적화:** `Portfolio`와 `Request` 테이블의 `title`, `description`, `tags` 컬럼에 **MySQL의 Full-Text Index**를 적용합니다.
2.  **쿼리:** `MATCH (title, description, tags) AGAINST ('검색어' IN NATURAL LANGUAGE MODE)` 구문을 사용하여 DB에서 직접 검색을 수행합니다.
3.  **(고급/선택):** 트래픽이 많아질 경우, 별도의 검색 엔진 **Elasticsearch** 또는 **MeiliSearch**를 도입하여 데이터를 인덱싱하고 검색 요청을 처리합니다.

---

### 8.3. 📈 스케줄링 및 배치(Batch) 처리 알고리즘

**목표:** 특정 시간에 시스템이 자동으로 로직을 실행해야 합니다. (e.g., 멤버십 갱신, 알림 발송)
**알고리즘:** **크론 잡 (Cron Job) / 스케줄링**
**구현:** `node-cron` 같은 라이브러리나 Vercel의 'Cron Jobs' 기능을 사용하여 백엔드 스크립트를 주기적으로 실행합니다.

#### 8.3.1. 멤버십/VIP 등급 산정 (비즈니스 정책)
* **주기:** 매일 새벽 1시 (`0 1 * * *`)
* **로직:**
    1.  모든 `designer` 역할의 `User`를 조회합니다.
    2.  각 사용자별로 지난 30일간의 `Transaction` 완료 건수를 집계합니다.
    3.  `Membership` 테이블의 `tier`를 조건(e.g., 100건 이상)에 따라 'VIP' 또는 'STANDARD'로 갱신합니다.

#### 8.3.2. 상태 모니터링 및 알림 (Epic 9)
* **주기:** 매시간 1회 (`0 * * * *`)
* **로직:**
    1.  `Transaction` 테이블에서 `paymentStatus`가 'HELD'이고, `updatedAt`이 7일 이상 경과한 거래를 모두 조회합니다.
    2.  FCM API를 호출하여 해당 거래의 `buyerId`(간판업자)에게 "거래 완료를 승인해 주세요"라는 푸시 알림을 발송합니다.

---

## 9. 구현 현황 (Implementation Status)

### 9.1. ✅ 완료된 기능 (Completed Features)

#### 실시간 채팅 시스템 (Socket.IO)
* **구현 일자:** 2024
* **기술 스택:** Socket.IO, Next.js Custom Server
* **주요 파일:**
  - `server.js` - Socket.IO 서버 설정 및 커스텀 Next.js 서버
  - `/src/features/chat/components/ChatInterface.js` - 실시간 채팅 UI 컴포넌트
  - `/src/app/api/chat/rooms/route.js` - 채팅방 생성 API
  - `/src/app/api/chat/rooms/[roomId]/messages/route.js` - 메시지 CRUD API
  - `/src/app/api/chat/rooms/[roomId]/route.js` - 채팅방 삭제 API
* **기능:**
  - 1:1 실시간 메시지 송수신
  - 읽음 처리 (read receipts)
  - 타이핑 인디케이터
  - 카카오톡 스타일 UI (노란색 말풍선 #fae100, 파란색 배경 #b2c7d9)
  - 채팅방 삭제 기능 (권한 확인 포함)
  - 스크롤 오버플로우 수정 (메시지 영역과 채팅방 목록 max-height 설정)

#### 포트폴리오 구매 추적 시스템
* **구현 일자:** 2024
* **주요 파일:**
  - `/src/features/portfolio/components/PortfolioBrowser.js` - 구매한 포트폴리오 표시 로직
  - `/src/features/portfolio/components/PortfolioBrowser.module.css` - 구매 완료 배지 스타일
* **기능:**
  - 사용자가 구매한 포트폴리오에 "✅ 결제 완료" 초록색 배지 표시
  - 구매한 포트폴리오는 초록색 테두리로 강조
  - "🛒 구매하기" 버튼을 "📋 거래 보기" 버튼으로 자동 변경
  - 거래 보기 버튼 클릭 시 `/transactions` 페이지로 이동
  - `fetchPurchasedPortfolios()` 함수로 사용자의 거래 내역 조회

#### 결제 및 거래 플로우 개선
* **구현 일자:** 2024
* **주요 파일:**
  - `/src/features/payment/components/PaymentForm.js`
* **기능:**
  - 결제 완료 후 `/transactions` 페이지로 자동 리다이렉트
  - transactionId가 있으면 거래 상세 페이지로 즉시 이동
  - 사용자가 결제 결과를 바로 확인 가능

#### 의뢰하기 시스템 (Request & Proposal)
* **구현 일자:** 2024
* **기술 스택:** MySQL, Next.js API Routes
* **데이터베이스:**
  - `requests` 테이블 - 디자인 의뢰 정보 저장
  - `proposals` 테이블 - 디자이너 제안 정보 저장
* **주요 파일:**
  - `/src/lib/migrations/create_requests_table.sql` - 테이블 생성 SQL
  - `/src/app/api/requests/route.js` - 의뢰 목록 조회 및 생성 API
  - `/src/app/api/requests/[id]/route.js` - 의뢰 상세/수정/삭제 API
  - `/src/app/api/proposals/route.js` - 제안 생성 API
  - `/src/app/api/proposals/[id]/route.js` - 제안 수락/거절 API
  - `/src/app/requests/page.js` - 의뢰 목록 페이지
  - `/src/app/requests/create/page.js` - 의뢰 작성 페이지
* **기능:**
  - 간판업자가 디자인 의뢰글 작성 (제목, 설명, 업종, 예산, 태그)
  - 의뢰 상태 관리 (OPEN, MATCHED, COMPLETED, CANCELLED)
  - 디자이너가 의뢰에 제안 (메시지, 제안 가격)
  - 간판업자가 제안 수락 시 자동으로 거래(Transaction) 생성
  - 제안 수락 시 의뢰 상태 자동 변경 (OPEN → MATCHED)
  - 제안 수락 시 다른 제안들 자동 거절 처리
  - 필터링 (모집중, 매칭완료, 완료, 취소)
  - 카테고리별 분류 (치킨집, 커피숍, 음식점 등)

#### UI/UX 개선
* **구현 일자:** 2024
* **개선 사항:**
  - 채팅 UI 스크롤 오버플로우 수정 (헤더/사이드바와 겹치지 않도록)
  - 로그인 페이지에서 데모 계정 섹션 완전 제거
  - `handleDemoLogin()` 함수 제거로 코드 정리
  - 구매한 포트폴리오 시각적 구분 (초록색 테두리 및 배지)

### 9.2. 🚧 진행중/계획된 기능 (In Progress / Planned)

#### 광고주 채팅 기록 표시 확인 (TODO #6)
* **상태:** 검증 필요
* **설명:** 광고주(user 역할) 계정으로 로그인 시 이전 채팅 기록이 정상적으로 표시되는지 테스트 필요
* **파일:** `/src/features/chat/components/ChatInterface.js`

#### 커뮤니티 자유게시판 (Epic 6)
* **상태:** 미구현
* **필요 작업:**
  - `board_posts` 및 `board_comments` 테이블 생성
  - 게시글 CRUD API 구현
  - 좋아요/싫어요 기능
  - 댓글 시스템
  - 신고 기능

#### 리뷰 및 평점 시스템 (Epic 3)
* **상태:** 미구현
* **필요 작업:**
  - `reviews` 테이블 생성
  - 거래 완료 후 리뷰 작성 UI
  - 평균 평점 계산 및 표시

#### FCM 푸시 알림 (Epic 9)
* **상태:** 미구현
* **필요 작업:**
  - Firebase 프로젝트 설정
  - FCM SDK 통합
  - 알림 트리거 이벤트 정의
  - 알림 수신 및 표시 UI

### 9.3. 📝 기술 부채 및 개선 사항 (Technical Debt)

* **CSS 중복 및 리팩토링 필요:**
  - `.purchaseButton`, `.contactButton`, `.viewTransactionButton` 등 유사한 버튼 스타일 여러 개 존재
  - 공통 버튼 베이스 클래스 생성 고려
  
* **Lint Warning:**
  - CSS에서 `-webkit-line-clamp` 사용 시 표준 속성 누락 경고
  - 브라우저 호환성을 위해 표준 속성 추가 권장

* **API 에러 핸들링 통일:**
  - 현재 각 API 엔드포인트마다 에러 메시지 형식이 다름
  - 통일된 에러 응답 포맷 정의 필요

* **타입 안전성:**
  - JavaScript 프로젝트이지만 점진적으로 TypeScript 도입 검토
  - Prop Types 또는 JSDoc을 통한 타입 힌팅 추가

### 9.4. 🔑 주요 API 엔드포인트 (Key API Endpoints)

#### 인증 (Authentication)
* `POST /api/auth/register` - 회원가입
* `POST /api/auth/[...nextauth]` - 로그인 (Next-Auth)
* `GET /api/auth/session` - 세션 확인

#### 포트폴리오 (Portfolios)
* `GET /api/portfolios` - 포트폴리오 목록 조회
* `POST /api/portfolios` - 포트폴리오 생성
* `GET /api/portfolios/[id]` - 포트폴리오 상세 조회
* `PATCH /api/portfolios/[id]` - 포트폴리오 수정
* `DELETE /api/portfolios/[id]` - 포트폴리오 삭제

#### 채팅 (Chat)
* `GET /api/chat/rooms` - 채팅방 목록 조회
* `POST /api/chat/rooms` - 채팅방 생성
* `DELETE /api/chat/rooms/[roomId]` - 채팅방 삭제
* `GET /api/chat/rooms/[roomId]/messages` - 메시지 목록 조회
* `POST /api/chat/rooms/[roomId]/messages` - 메시지 전송

#### 거래 (Transactions)
* `GET /api/transactions` - 거래 목록 조회
* `POST /api/transactions` - 거래 생성
* `GET /api/transactions/[id]` - 거래 상세 조회
* `PATCH /api/transactions/[id]` - 거래 상태 변경

#### 의뢰 (Requests)
* `GET /api/requests` - 의뢰 목록 조회 (상태별 필터링 지원)
* `POST /api/requests` - 의뢰 생성
* `GET /api/requests/[id]` - 의뢰 상세 조회 (제안 목록 포함)
* `PATCH /api/requests/[id]` - 의뢰 수정
* `DELETE /api/requests/[id]` - 의뢰 삭제

#### 제안 (Proposals)
* `POST /api/proposals` - 제안 생성 (디자이너 전용)
* `PATCH /api/proposals/[id]` - 제안 수락/거절 (의뢰자 전용)
* `DELETE /api/proposals/[id]` - 제안 삭제 (디자이너 전용)

#### 관리자 (Admin)
* `GET /api/admin/users` - 사용자 목록 조회
* `GET /api/admin/portfolios` - 전체 포트폴리오 관리
* `GET /api/admin/transactions` - 전체 거래 내역 조회

### 9.5. 🎨 디자인 시스템 (Design System)

#### 색상 팔레트 (Color Palette)
* **Primary Gradient:** `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
* **Success (Green):** `#10b981` (구매 완료, 성공 상태)
* **Background Gradient:** `linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)`
* **Kakao Yellow:** `#fae100` (채팅 말풍선)
* **Kakao Blue:** `#b2c7d9` (채팅 배경)
* **Text Primary:** `#1a202c`
* **Text Secondary:** `#718096`

#### 타이포그래피 (Typography)
* **Title (h1):** `2rem`, `font-weight: 800`
* **Subtitle:** `1rem`, `color: #718096`
* **Body:** `1rem`, `line-height: 1.6`

#### 컴포넌트 스타일 (Component Styles)
* **버튼 (Buttons):**
  - 기본 패딩: `12px 24px`
  - 보더 라디우스: `12px`
  - 호버 효과: `transform: scale(1.05)` 또는 `translateY(-2px)`
  - 그림자: `0 4px 15px rgba(102, 126, 234, 0.4)`

* **카드 (Cards):**
  - 배경: `white`
  - 보더 라디우스: `20px`
  - 그림자: `0 4px 15px rgba(0, 0, 0, 0.08)`
  - 호버 시: `translateY(-5px)`, 그림자 강화

* **배지 (Badges):**
  - 보더 라디우스: `20px`
  - 패딩: `6px 12px`
  - 폰트 크기: `0.85rem`
  - 폰트 웨이트: `700`

---

## 10. 개발 환경 및 배포 (Development & Deployment)

### 10.1. 로컬 개발 환경
* **Node.js:** v18 이상 권장
* **MySQL:** 8.0 이상
* **패키지 매니저:** npm 또는 yarn
* **개발 서버 포트:** 3000

### 10.2. 환경 변수 (.env)
```
DATABASE_URL="mysql://root:password@localhost:3306/10badv"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 10.3. 실행 명령어
```bash
# 개발 서버 실행 (Socket.IO 포함)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

### 10.4. 데이터베이스 마이그레이션
```bash
# requests 및 proposals 테이블 생성
mysql -u root -p 10badv < src/lib/migrations/create_requests_table.sql
```

---

## 11. 참고 사항 (Additional Notes)

* **Socket.IO 커스텀 서버:** Next.js의 기본 서버 대신 `server.js`를 사용하여 Socket.IO 통합
* **Session 관리:** Next-Auth를 사용하며, JWT 전략으로 세션 저장
* **파일 업로드:** 포트폴리오 이미지는 로컬 `public/uploads` 폴더에 저장 (추후 AWS S3 마이그레이션 예정)
* **보안:** 비밀번호는 bcrypt로 해싱, API 엔드포인트는 세션 기반 권한 확인
