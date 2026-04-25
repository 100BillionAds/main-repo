# Payment Test Matrix

이 문서는 운영 배포 전 결제 플로우 검증 기준을 정의합니다.

## Preconditions

- `PORTONE_MOCK_MODE=false`
- `NEXT_PUBLIC_PAYMENT_MOCK_MODE=false`
- `PORTONE_API_SECRET` 설정
- `NEXT_PUBLIC_PORTONE_STORE_ID` 설정
- `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` 설정
- 관리자 계정 1개, 일반 사용자 계정 1개 준비

## API Smoke

| ID | Scenario | Request | Expected |
|---|---|---|---|
| API-01 | Health check | `GET /api/health` | `200`, `status=ok` |
| API-02 | Payment verify requires auth | `POST /api/payments/verify` (no session) | `401` |
| API-03 | Dashboard stats (admin) | `GET /api/dashboard/stats` | `200`, `success=true`, `stats` 포함 |
| API-04 | Admin users list | `GET /api/admin/users` (admin session) | `200`, `users[]` 반환 |

## Payment Flow (UI)

| ID | Role | Scenario | Expected |
|---|---|---|---|
| UI-01 | 광고주 | 포트폴리오 결제 성공 | 결제 완료 후 거래 생성, 내 거래에서 상태 확인 |
| UI-02 | 광고주 | 결제 취소 | 결제 미완료, 거래 미생성 |
| UI-03 | 광고주 | 결제 실패(카드 오류 등) | 사용자 에러 메시지 노출, 포인트 미반영 |
| UI-04 | 디자이너 | 거래 진행 상태 업데이트 | `in_progress -> awaiting_confirmation -> completed` 전이 가능 |
| UI-05 | 관리자 | 결제/거래 대시보드 확인 | 통계 API 500 없음, 수치 렌더 정상 |

## Data Integrity Checks (DB)

| ID | Check | SQL |
|---|---|---|
| DB-01 | 결제 레코드 완료 처리 | `SELECT id, status, paid_at FROM payments ORDER BY id DESC LIMIT 5;` |
| DB-02 | 포인트 변동 이력 | `SELECT user_id, type, amount, balance_after FROM point_transactions ORDER BY id DESC LIMIT 10;` |
| DB-03 | 거래 수수료 계산 | `SELECT id, amount, commission, status FROM transactions ORDER BY id DESC LIMIT 10;` |
| DB-04 | 결제 후 채팅방 연결 | `SELECT id, payment_id, user1_id, user2_id FROM chat_rooms WHERE payment_id IS NOT NULL ORDER BY id DESC LIMIT 5;` |

## Release Gate Commands

```bash
cd 10badv
npm run lint
npm run test:unit
DATABASE_HOST=127.0.0.1 DATABASE_PORT=3310 DATABASE_USER=root DATABASE_PASSWORD='' DATABASE_NAME=10badv_test NEXTAUTH_SECRET=integration-secret NEXTAUTH_URL=http://localhost:3000 NODE_ENV=test npm run test:integration
npm run build
```

## Sign-off Checklist

- [ ] API smoke 4개 모두 통과
- [ ] UI 결제 플로우 5개 통과
- [ ] DB 무결성 체크 4개 확인
- [ ] 릴리즈 게이트 명령 4개 통과
- [ ] 운영 환경변수/시크릿 최종 확인
