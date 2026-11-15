# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- AI 의뢰서 초안 작성: 의뢰 작성 화면에서 짧은 메모를 의뢰서 형태로 다듬어 스트리밍으로 채워 줌 (`POST /api/ai/request-draft`)
- LLM 제공자 추상화 `src/lib/llm` (anthropic / openai / mock), 제한 시간·재시도·대체 제공자, 버전 관리되는 프롬프트, 사용 기록 테이블 `ai_requests` 와 사용자별 하루 한도. 문서 `docs/LLM.md`
- 도메인 계층 정리: 금액 값 객체 `Money`, 거래 엔티티 `Trade`, 저장소 `tradeRepository`. 에스크로 서비스는 순서 조율만 담당
- 스키마 마이그레이션 체계: 번호가 붙은 마이그레이션(`src/lib/migrations`), 적용 기록 테이블 `schema_migrations`, DB 잠금(`GET_LOCK`)으로 동시 실행 방지, 체크섬으로 적용된 마이그레이션 변조 감지. 문서 `docs/MIGRATIONS.md`
- 에스크로 자동정산: 작업 완료 제출 후 기한(기본 7일) 내 구매확정이 없으면 자동 구매확정, 결제 후 기한 내 디자이너가 작업을 시작하지 않으면 자동 취소·환불
- 자동정산 API `POST /api/cron/settle` 와 `server.js` 내장 스케줄러, Vercel 크론 설정
- 도메인 계층 `src/domain` (포인트 원장, 에스크로 정책·서비스)
- 거래 상세 화면에 자동정산 기한 안내
- 서버 시작 시 스키마 자동 초기화 (`src/instrumentation.js`)
- 배포: 운영용 `docker-compose.prod.yml`, `Caddyfile`, GHCR 이미지 빌드와 SSH 배포를 수행하는 `cd` 워크플로
- 에스크로 정책 단위 테스트, 동시성 통합 테스트
- 문서: `docs/ESCROW.md`

### Changed
- 포트원 결제 조회 코드를 `src/lib/payment/portoneGateway.js` 로 분리 (동작 동일)

### Fixed
- 수수료율이 10% 가 아닐 때 부동소수점 오차로 수수료가 1원 적게 계산될 수 있던 문제 (예: 3,000원 × 29% = 869원 → 870원)
- 제안 수락 시 구매자 포인트를 차감하지 않고 거래가 만들어져, 거래 완료 시 디자이너에게 없는 포인트가 지급되던 문제
- 결제 검증 요청이 동시에 오면 포인트가 중복 충전될 수 있던 문제
- 거래 상태 변경 요청이 동시에 오면 대금이 중복 지급되거나 지급과 환불이 함께 일어날 수 있던 문제
- Socket.io 가 클라이언트가 보낸 사용자 ID 를 그대로 믿어, 남의 채팅방에 입장하거나 남의 이름으로 메시지를 보낼 수 있던 문제
- MySQL 에서 `CREATE INDEX IF NOT EXISTS` 가 지원되지 않아 인덱스가 하나도 만들어지지 않던 문제
- 거래 목록 조회의 `LIMIT ? OFFSET ?` 바인딩 오류
- Dockerfile 이 비활성화된 standalone 출력을 복사해 빌드가 실패하던 문제
- 결제·인출 금액에 정수가 아닌 값이 들어갈 수 있던 문제, 인출 최소 금액 안내가 화면과 서버에서 다르던 문제
- 운영 빌드에서 서버 오류 로그까지 제거되던 문제

### Changed
- 작업이 시작된 거래는 구매자가 혼자 취소할 수 없음 (디자이너 또는 관리자만 가능)
- 스키마 초기화가 회원가입 API 최초 호출 시점이 아니라 서버 시작 시점에 실행됨
- `cd-backend`, `cd-admin` 워크플로 틀을 실제 동작하는 `cd` 하나로 교체
- `docs/ERD.md` 를 실제 스키마에 맞게 다시 작성, `docs/DEPLOYMENT.md` 를 Docker 배포 중심으로 다시 작성

### Added (initial)
- Initial project structure with Next.js 16
- Modern UI components (Button, Card, Input, Loading)
- Authentication ready with NextAuth.js
- Dashboard page with statistics
- Projects management (list and detail pages)
- Interactive demo page
- API routes (health check, tasks CRUD)
- Custom hooks (useLocalStorage, useMediaQuery, useToggle)
- Utility functions (helpers, API client)
- Comprehensive test suite
- Dark mode support
- Responsive design
- Error handling (404, error pages)
- Loading states
- SEO optimization

### Changed
- Improved global styles with custom CSS variables
- Enhanced navigation with active states
- Refactored layout components

### Fixed
- N/A

## [0.1.0] - 2025-11-13

### Added
- Project initialization
- Basic Next.js setup
- Development environment configuration
- Prettier and ESLint configuration
- Jest testing setup

---

## Release Notes

### Version 0.1.0 (2025-11-13)

초기 릴리스:
- Next.js 16 기반 프로젝트 구조
- 재사용 가능한 UI 컴포넌트 라이브러리
- 다크 모드 지원
- 반응형 디자인
- 테스트 환경 구축
- API 라우트 기본 구조
- 개발 도구 설정 (ESLint, Prettier, Jest)
