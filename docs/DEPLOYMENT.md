# 10badv Deployment Guide

이 문서는 10badv 애플리케이션을 다양한 플랫폼에 배포하는 방법을 설명합니다.

## 🚀 Vercel + 저비용 MySQL 배포 (권장)

Vercel은 Next.js 애플리케이션을 배포하기에 가장 적합한 플랫폼입니다.

### 1. Vercel CLI 설치

```bash
npm i -g vercel
```

### 2. Vercel 로그인

```bash
vercel login
```

### 3. 프로젝트 배포

```bash
cd 10badv
vercel
```

### 4. 환경 변수 설정

Vercel 대시보드에서 다음 환경 변수를 설정하세요:

- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- 기타 필요한 환경 변수

### 4-1. 비용 0원 클로즈드 테스트 모드

DB 비용을 당장 쓰지 않을 경우, 아래처럼 운영을 읽기 중심으로 잠시 전환할 수 있습니다.

1. Vercel 환경 변수 설정:
   - `CLOSED_BETA_MODE=true`
   - `NEXT_PUBLIC_CLOSED_BETA_MODE=true`
2. `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_NAME`는 비워둠
3. 재배포

이 모드에서는:
- 회원가입/결제/쓰기 API(POST/PUT/PATCH/DELETE)가 503으로 차단됩니다.
- 홈/조회 페이지는 유지됩니다.
- 공개 회원가입 버튼과 일부 동선이 자동으로 제한됩니다.

### 5. 저비용 DB 선택지

AWS RDS 대신 아래 옵션을 우선 권장합니다.

1. **Railway MySQL (권장)**
   - 빠른 초기 세팅, 소규모 트래픽에 유리한 비용 구조
   - 발급받은 host/user/password/database를 Vercel 환경 변수에 입력
2. **PlanetScale (MySQL 호환)**
   - 브랜치/배포 워크플로우 강점, 서버리스 트래픽 대응
3. **로컬/스테이징**
   - `10badv/docker-compose.yml`의 MySQL 서비스 활용

> 참고: 현재 저장소는 MySQL(`DATABASE_HOST/USER/PASSWORD/NAME`) 기반 연결을 사용합니다.

### 6. 프로덕션 배포

```bash
vercel --prod
```

## 🐳 Docker 배포 (로컬/스테이징)

### Dockerfile 사용

```bash
# 이미지 빌드
docker build -t 10badv .

# 컨테이너 실행
docker run -p 3000:3000 10badv
```

### Docker Compose 사용

```bash
cd 10badv
docker compose up -d db
docker compose up -d app
```

## 🌐 다른 플랫폼

### Netlify

1. GitHub 저장소 연결
2. 빌드 설정:
   - Build command: `cd 10badv && npm run build`
   - Publish directory: `10badv/.next`
3. 환경 변수 설정

### Railway (백엔드/DB 통합 대안)

1. Railway 프로젝트 생성
2. GitHub 저장소 연결
3. MySQL 서비스 추가 후 환경 변수 연결
4. `10badv` 앱 서비스 배포

## 📋 배포 전 체크리스트

- [ ] Unit 테스트 통과 (`npm run test:unit`)
- [ ] 통합 테스트 통과 (`npm run test:integration`)
- [ ] Lint 오류 없음 (`npm run lint`)
- [ ] 환경 변수 설정 완료
- [ ] 데이터베이스 마이그레이션 완료
- [ ] 프로덕션 빌드 테스트 (`npm run build && npm start`)
- [ ] 성능 최적화 확인
- [ ] SEO 메타 태그 확인
- [ ] 보안 취약점 점검

## 🔒 보안 설정

### 환경 변수

프로덕션 환경에서는 반드시 안전한 값을 사용하세요:

```bash
# 강력한 시크릿 생성
openssl rand -base64 32
```

### HTTPS 설정

프로덕션에서는 반드시 HTTPS를 사용하세요.

### CORS 설정

필요한 도메인만 허용하도록 설정하세요.

## 📊 모니터링

### Vercel Analytics

Vercel 대시보드에서 자동으로 제공됩니다.

### Sentry (오류 추적)

```bash
npm install @sentry/nextjs
```

### Google Analytics

`.env.local`:
```bash
NEXT_PUBLIC_GA_ID=your-ga-id
```

## 🔄 CI/CD

### GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: cd 10badv && npm ci
      - run: cd 10badv && npm test
      - run: cd 10badv && npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🔧 성능 최적화

### 이미지 최적화

Next.js Image 컴포넌트를 사용하여 자동 최적화

### 코드 스플리팅

동적 import를 사용하여 필요한 코드만 로드

```javascript
import dynamic from 'next/dynamic';

const DynamicComponent = dynamic(() => import('../components/Heavy'));
```

### 캐싱

적절한 Cache-Control 헤더 설정

## 📱 모바일 최적화

- 반응형 디자인 확인
- Touch 이벤트 테스트
- 모바일 성능 측정

## 🌍 다국어 지원

Next.js i18n 설정을 통한 다국어 지원

## 📝 배포 후 작업

1. 도메인 연결
2. SSL 인증서 확인
3. 모니터링 설정
4. 백업 전략 수립
5. 장애 복구 계획 수립

## 🆘 트러블슈팅

### 빌드 실패

- 의존성 버전 확인
- 환경 변수 확인
- 빌드 로그 확인

### 런타임 오류

- 서버 로그 확인
- 브라우저 콘솔 확인
- Sentry 오류 리포트 확인

## 📞 지원

문제가 발생하면 GitHub Issues를 통해 문의해주세요.
