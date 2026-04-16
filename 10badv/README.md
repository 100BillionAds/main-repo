# 10badv - 개발 가이드

> 백억광고 애플리케이션 코드

## 🚀 빠른 시작

## 🔒 비용 0원 클로즈드 테스트 모드

운영 비용을 당장 쓰지 않으려면 아래처럼 설정하세요.

```env
CLOSED_BETA_MODE=true
NEXT_PUBLIC_CLOSED_BETA_MODE=true
# DATABASE_URL 또는 DATABASE_HOST / DATABASE_USER / DATABASE_NAME 미설정 상태 유지
```

- 프로덕션에서 회원가입/결제/쓰기 API(POST/PUT/PATCH/DELETE)가 자동 차단됩니다.
- 메인 랜딩/조회 중심 페이지는 계속 열어둘 수 있습니다.
- 다시 오픈하려면 `NEXT_PUBLIC_CLOSED_BETA_MODE=false`로 바꾸고 `DATABASE_*`를 채우면 됩니다.

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
DATABASE_URL=mysql://root:your_password@localhost:3306/10badv
DATABASE_SSL=false
DATABASE_SSL_REJECT_UNAUTHORIZED=true
# (대안) DATABASE_HOST / DATABASE_PORT / DATABASE_USER / DATABASE_PASSWORD / DATABASE_NAME

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key_here

# Storage (free tier recommended)
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

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

또는 Docker 기반으로 저비용 로컬 실행:

```bash
docker compose up -d db
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

# 단위 테스트
npm run test:unit

# 통합 테스트 (MySQL 필요)
npm run test:integration

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
