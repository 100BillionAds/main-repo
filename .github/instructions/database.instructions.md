---
description: "백억광고" 프로젝트의 데이터베이스 스키마와 명명 규칙입니다. (MySQL + Sequelize)
applyTo: "**/*.sql, **/migrations/*.js, **/models/*.js"
---

# 1. 데이터베이스 기본 규칙

* **데이터베이스 시스템:** **MySQL**
* **ORM:** **Sequelize** (JavaScript)
* **테이블 명명:** 테이블 이름은 **소문자 스네이크 케이스(snake_case)**를 사용합니다. (예: `users`, `user_wallets`)
* **컬럼 명명:** 컬럼 이름 역시 **소문자 스네이크 케이스(snake_case)**를 사용합니다. (예: `phone_number`)
* **Primary Key (PK):** 모든 테이블은 `id` (Integer)를 Primary Key로 가지며, **자동으로 증가(Auto Increment)**합니다.
* **Foreign Key (FK):** 외래 키 컬럼은 `[참조테이블명_id]` 형식을 따릅니다. (예: `users`를 참조하면 `user_id`)
* **문자열 타입:** `char`, `varchar` 대신 **`text`** 사용을 원칙으로 합니다. (Sequelize: `DataTypes.TEXT`)
* **불리언(Boolean) 타입:** `is_` 또는 `has_` 접두사를 사용합니다. (예: `is_read`)
* **타임스탬프:** 모든 테이블은 `created_at`과 `updated_at` 컬럼을 가집니다. (Sequelize의 `timestamps: true` 옵션으로 자동 관리)
* **환경 변수:** 모든 데이터베이스 연결 정보는 로컬 `.env` 파일에 저장하며, 코드에 절대 하드코딩하지 않습니다.

# 2. 핵심 테이블 스키마 (예시)

Copilot은 아래 스키마 구조와 관계를 인지하고 코드를 생성해야 합니다.

---

### `users` (사용자)

* `id`: Primary Key, 자동 증가
* `role`: Enum (`'designer'`, `'signMaker'`, `'user'`, `'admin'`)
* `username`: 닉네임 (`text`)
* `email`: 이메일 (`text`, Unique)
* `password`: 비밀번호 (`text`, 암호화 저장)
* `phone_number`: 연락처 (`text`, Unique)
* `profile_image`: 프로필 이미지 경로 (`text`, nullable)
* `bio`: 소개글 (`text`, nullable)
* `rating_average`: 평균 평점 (Float, default 0)
* `created_at`: 생성 날짜
* `updated_at`: 수정 날짜

### `portfolios` (디자이너 포트폴리오)

* `id`: Primary Key, 자동 증가
* `designer_id`: Foreign Key, `users` 테이블과 연결
* `title`: 포트폴리오 제목 (`text`)
* `description`: 상세 설명 (`text`)
* `price`: 판매 가격 (Integer)
* `tags`: 검색 태그 (JSON 또는 `text`)
* `images`: 디자인 이미지 URL (JSON 또는 `text`)
* `created_at`: 등록일
* `updated_at`: 수정일

### `requests` (의뢰글)

* `id`: Primary Key, 자동 증가
* `client_id`: Foreign Key, `users` 테이블(의뢰자)과 연결
* `title`: 글 제목 (`text`)
* `description`: 상세 설명 (`text`)
* `category`: 업종 카테고리 (`text`)
* `budget`: 예산 금액 (Integer)
* `status`: 진행 상태 (Enum: `'OPEN'`, `'MATCHED'`, `'COMPLETED'`, `'CANCELLED'`)
* `created_at`: 등록일
* `updated_at`: 수정일

### `proposals` (디자이너 제안)

* `id`: Primary Key, 자동 증가
* `request_id`: Foreign Key, `requests` 테이블과 연결
* `designer_id`: Foreign Key, `users` 테이블과 연결
* `message`: 제안 메시지 (`text`)
* `offer_price`: 제안 가격 (Integer)
* `status`: 수락 상태 (Enum: `'PENDING'`, `'ACCEPTED'`, `'REJECTED'`)
* `created_at`: 제안일
* `updated_at`: 수정일

### `transactions` (거래 내역)

* `id`: Primary Key, 자동 증가
* `buyer_id`: Foreign Key, `users` 테이블(구매자)과 연결
* `seller_id`: Foreign Key, `users` 테이블(판매자)과 연결
* `proposal_id`: Foreign Key, `proposals` 테이블과 연결 (nullable)
* `portfolio_id`: Foreign Key, `portfolios` 테이블과 연결 (nullable)
* `amount`: 결제 금액 (Integer)
* `commission`: 플랫폼 수수료 (Integer)
* `payment_status`: 결제 상태 (Enum: `'PENDDEN'`, `'PAID'`, `'REFUNDED'`, `'HELD'`)
* `created_at`: 거래 생성일
* `updated_at`: 거래 수정일

### `user_wallets` (포인트 지갑)

* `id`: Primary Key, 자동 증가
* `user_id`: Foreign Key, `users` 테이블과 연결 (Unique)
* `balance`: 포인트 잔액 (Integer, default 0)
* `created_at`: 생성일
* `updated_at`: 수정일

### `memberships` (멤버십)

* `id`: Primary Key, 자동 증가
* `user_id`: Foreign Key, `users` 테이블과 연결 (Unique)
* `tier`: 등급 (Enum: `'NONE'`, `'STANDARD'`, `'VIP'`)
* `start_date`: 시작일 (DateTime)
* `end_date`: 만료일 (DateTime, nullable)
* `created_at`: 생성일
* `updated_at`: 수정일