# 백억광고 (100BillionAds) ERD

스키마의 기준은 `10badv/src/lib/migrations/` 의 마이그레이션입니다. 서버가 시작될 때(`src/instrumentation.js`) 아직 적용되지 않은 마이그레이션만 순서대로 실행하고, 적용 기록을 `schema_migrations` 테이블에 남깁니다. 자세한 내용은 [MIGRATIONS.md](./MIGRATIONS.md) 를 보세요.

## Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ portfolios : "등록"
    users ||--o{ requests : "의뢰"
    users ||--o{ proposals : "제안"
    users ||--o{ transactions : "구매자/디자이너"
    users ||--o{ point_transactions : "포인트 기록"
    users ||--o{ payments : "충전 결제"
    users ||--o{ reviews : "작성/대상"
    users ||--o{ chat_rooms : "참여"
    users ||--o{ chat_messages : "발신"
    users ||--o{ bug_reports : "신고"
    portfolios ||--o{ portfolio_images : "이미지"
    portfolios ||--o{ transactions : "구매"
    requests ||--o{ proposals : "받은 제안"
    proposals ||--o| transactions : "수락 시 생성"
    transactions ||--o{ reviews : "후기"
    chat_rooms ||--o{ chat_messages : "메시지"

    users {
        INT id PK
        VARCHAR username UK
        VARCHAR password "bcrypt 해시"
        VARCHAR name
        VARCHAR email
        ENUM role "admin/user/designer"
        TEXT avatar_url
        TEXT bio
        VARCHAR phone
        INT points "포인트 잔액"
        DECIMAL rating
        INT review_count
        ENUM status "active/suspended/deleted"
    }

    portfolios {
        INT id PK
        INT designer_id FK
        TEXT title
        TEXT description
        VARCHAR category
        INT price
        TEXT thumbnail_url
        ENUM status "pending/approved/rejected"
        INT views
        INT likes
    }

    portfolio_images {
        INT id PK
        INT portfolio_id FK
        TEXT image_url
        INT display_order
    }

    requests {
        INT id PK
        INT client_id FK
        TEXT title
        TEXT description
        VARCHAR category
        INT budget
        JSON tags
        ENUM status "OPEN/MATCHED/COMPLETED/CANCELLED"
    }

    proposals {
        INT id PK
        INT request_id FK
        INT designer_id FK
        TEXT message
        INT offer_price
        ENUM status "PENDING/ACCEPTED/REJECTED"
    }

    transactions {
        INT id PK
        INT portfolio_id FK "포트폴리오 구매일 때"
        INT proposal_id FK "제안 수락일 때"
        INT buyer_id FK
        INT designer_id FK
        INT amount "보관 금액"
        INT commission "정산 시 수수료"
        ENUM status "pending/in_progress/awaiting_confirmation/completed/cancelled"
        VARCHAR payment_method
        ENUM payment_status "pending/completed/failed/refunded"
        ENUM escrow_status "none/held/released/refunded"
        ENUM settled_by "buyer/designer/admin/auto"
        VARCHAR cancel_reason
        DATETIME started_at
        DATETIME submitted_at
        DATETIME auto_confirm_at "자동 구매확정 기한"
        DATETIME auto_cancel_at "자동 취소 기한"
        DATETIME completed_at
        DATETIME cancelled_at
    }

    point_transactions {
        INT id PK
        INT user_id FK
        ENUM type "charge/use/earn/refund/withdraw"
        INT amount
        INT fee
        INT balance_after
        TEXT description
        VARCHAR reference_type "payment/transaction"
        INT reference_id
        ENUM status "pending/completed/failed/cancelled"
    }

    payments {
        INT id PK
        INT user_id FK
        VARCHAR merchant_uid UK
        VARCHAR imp_uid "PortOne 결제 ID"
        TEXT order_name
        INT amount
        VARCHAR payment_method
        ENUM status "pending/completed/failed/refunded"
        INT portfolio_id FK
        VARCHAR pg_provider
        VARCHAR pg_tid
        VARCHAR card_name
        TIMESTAMP paid_at
    }

    reviews {
        INT id PK
        INT transaction_id FK
        INT reviewer_id FK
        INT designer_id FK
        INT rating "1~5"
        TEXT comment
    }

    chat_rooms {
        INT id PK
        INT user1_id FK "두 참여자 중 작은 ID"
        INT user2_id FK "두 참여자 중 큰 ID"
        INT portfolio_id
        INT transaction_id
        INT payment_id
        TEXT last_message
        TIMESTAMP last_message_at
    }

    chat_messages {
        INT id PK
        INT room_id FK
        INT sender_id FK
        TEXT message
        ENUM message_type "text/image/file"
        TEXT file_url
        VARCHAR file_name
        INT file_size
        TINYINT is_read
    }

    bug_reports {
        INT id PK
        INT user_id FK
        VARCHAR title
        TEXT description
        TEXT page_url
        TEXT screenshot_url
        ENUM severity "low/medium/high/critical"
        ENUM status "open/in_progress/resolved/closed"
        TEXT admin_note
    }
```

모든 테이블에 `created_at` 이 있고, 대부분 `updated_at` 도 있습니다 (다이어그램에서는 생략).

## 테이블 설명

| 테이블 | 역할 |
|--------|------|
| `users` | 광고주(`user`), 디자이너(`designer`), 관리자(`admin`). `points` 가 포인트 잔액 |
| `portfolios`, `portfolio_images` | 디자이너가 올린 작품. 관리자 승인(`approved`) 후 구매 가능 |
| `requests`, `proposals` | 광고주의 의뢰와 디자이너의 제안. 제안을 수락하면 거래가 생김 |
| `transactions` | 거래 한 건. 에스크로 보관·정산·환불의 단위 ([ESCROW.md](./ESCROW.md)) |
| `point_transactions` | 포인트 원장. 잔액이 바뀔 때마다 한 줄씩 남음 |
| `payments` | PortOne 포인트 충전 결제 |
| `reviews` | 거래 후기. 거래당 작성자 1건 |
| `chat_rooms`, `chat_messages` | 1:1 채팅 |
| `bug_reports` | 오류 신고 |

## 돈과 관련된 규칙

- `users.points` 는 `src/domain/points/ledger.js` 를 통해서만 바뀌고, 바뀔 때마다 `point_transactions` 에 기록됩니다.
- `point_transactions` 의 `(reference_type, reference_id, type)` 은 유니크입니다. 한 거래에 `use`, `earn`, `refund` 가 각각 한 번, 한 결제에 `charge` 가 한 번만 남습니다. 인출(`withdraw`)은 참조가 없어 제약을 받지 않습니다.
- `transactions.escrow_status` 가 `held` 인 거래만 정산하거나 환불할 수 있습니다.
- 수수료는 정산 시점에 계산해 `transactions.commission` 에 남깁니다.

## 주요 인덱스

| 테이블 | 인덱스 | 용도 |
|--------|--------|------|
| `transactions` | `(status, auto_confirm_at)`, `(status, auto_cancel_at)` | 자동정산 대상 조회 |
| `transactions` | `buyer_id`, `designer_id`, `status`, `created_at` | 내 거래 목록 |
| `point_transactions` | `(user_id, created_at)` | 포인트 내역 |
| `point_transactions` | `(reference_type, reference_id, type)` UNIQUE | 중복 기록 방지 |
| `chat_messages` | `(room_id, created_at)`, `(room_id, sender_id, is_read)` | 대화 조회, 안 읽은 메시지 |
| `portfolios` | `(designer_id, status)`, `category`, `status`, `created_at` | 목록·필터 |

## 스키마 변경 방법

`src/lib/migrations/` 에 새 마이그레이션 파일을 추가하고 `index.js` 목록 끝에 등록합니다. 이미 적용된 마이그레이션은 수정하지 않습니다. 절차와 규칙은 [MIGRATIONS.md](./MIGRATIONS.md) 에 있습니다.

### ai_requests

AI 호출 기록 ([LLM.md](./LLM.md)). 메모 원문과 응답은 저장하지 않습니다.

| 컬럼 | 설명 |
|---|---|
| `id` | PK |
| `user_id` | 호출한 사용자 (FK → users) |
| `feature` | 기능 이름 (예: `request_draft`) |
| `prompt_version` | 프롬프트 버전 (예: `v1`) |
| `provider`, `model` | 실제로 응답한 제공자와 모델 |
| `status` | `pending` / `success` / `error` / `rejected`(한도 초과) |
| `input_chars`, `input_tokens`, `output_tokens` | 사용량 |
| `latency_ms`, `error_code` | 걸린 시간, 실패 원인 |
| `created_at` | 호출 시각. `(user_id, created_at)` 인덱스로 하루 한도를 셉니다 |

### schema_migrations

| 컬럼 | 설명 |
|---|---|
| `id` | 마이그레이션 id (예: `0001_baseline`). PK |
| `checksum` | 적용 당시 내용의 SHA-256 |
| `description` | 설명 |
| `execution_ms` | 실행에 걸린 시간 |
| `applied_at` | 적용 시각 |
