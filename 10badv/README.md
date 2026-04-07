# 10badv - 개발 가이드

> 백억광고 애플리케이션 코드

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일 편집:

```env
# Database
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=your_password
DATABASE_NAME=10badv

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key_here

# PortOne (선택)
NEXT_PUBLIC_PORTONE_STORE_ID=your_store_id
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=your_channel_key
PORTONE_API_SECRET=your_api_secret
```

### 3. 데이터베이스 설정

```bash
# MySQL 데이터베이스 생성
mysql -u root -p -e "CREATE DATABASE 10badv CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 4. 개발 서버 실행

```bash
npm run dev
# http://localhost:3000
```

## 📁 프로젝트 구조

```
10badv/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API Routes
│   │   │   ├── auth/     # 인증 (NextAuth)
│   │   │   ├── chat/     # 채팅 API
│   │   │   ├── portfolios/  # 포트폴리오 API
│   │   │   ├── transactions/  # 거래 API
│   │   │   └── ...
│   │   ├── chat/         # 채팅 페이지
│   │   ├── portfolios/   # 포트폴리오 페이지
│   │   ├── my-transactions/  # 거래 내역
│   │   └── ...
│   ├── components/       # 공통 컴포넌트
│   │   ├── ui/           # 기본 UI (Button, Card, Input)
│   │   └── ...
│   ├── features/         # 기능별 모듈
│   │   ├── chat/         # 채팅 기능
│   │   ├── portfolio/    # 포트폴리오 기능
│   │   ├── payment/      # 결제 기능
│   │   └── admin/        # 관리자 기능
│   ├── hooks/            # 커스텀 훅
│   ├── lib/              # DB, 유틸리티
│   └── utils/            # 헬퍼 함수
├── public/
│   └── uploads/          # 파일 업로드 저장소
├── server.js             # Socket.io 커스텀 서버
└── package.json
```

## 🧪 테스트

```bash
# 전체 테스트
npm test

# Watch 모드
npm run test:watch

# 커버리지
npm run test:coverage
```

## 🏗️ 빌드

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

## 📝 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (Socket.io 포함) |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 프로덕션 서버 |
| `npm test` | Jest 테스트 |
| `npm run lint` | ESLint 검사 |
| `npm run format` | Prettier 포맷팅 |

## 🔧 주요 설정 파일

| 파일 | 설명 |
|------|------|
| `next.config.mjs` | Next.js 설정 |
| `jsconfig.json` | 경로 별칭 (`@/`) |
| `jest.config.js` | Jest 테스트 설정 |
| `.eslintrc.json` | ESLint 설정 |
| `.prettierrc` | Prettier 설정 |
| `server.js` | Socket.io 커스텀 서버 |

## 📚 더 자세한 문서

- [시스템 아키텍처](../docs/ARCHITECTURE.md)
- [데이터베이스 ERD](../docs/ERD.md)
- [배포 가이드](../docs/DEPLOYMENT.md)
- [기여 가이드](../docs/CONTRIBUTING.md)
