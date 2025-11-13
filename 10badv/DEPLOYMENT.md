# 10badv Deployment Guide

이 문서는 10badv 애플리케이션을 다양한 플랫폼에 배포하는 방법을 설명합니다.

## 🚀 Vercel 배포 (권장)

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

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- 기타 필요한 환경 변수

### 5. 프로덕션 배포

```bash
vercel --prod
```

## 🐳 Docker 배포

### Dockerfile 사용

```bash
# 이미지 빌드
docker build -t 10badv .

# 컨테이너 실행
docker run -p 3000:3000 10badv
```

### Docker Compose 사용

```bash
docker-compose up -d
```

## 🌐 다른 플랫폼

### Netlify

1. GitHub 저장소 연결
2. 빌드 설정:
   - Build command: `cd 10badv && npm run build`
   - Publish directory: `10badv/.next`
3. 환경 변수 설정

### AWS (Amplify/EC2)

#### AWS Amplify

1. AWS Amplify 콘솔 접속
2. 저장소 연결
3. 빌드 설정 구성
4. 배포 시작

#### EC2

```bash
# EC2 인스턴스에 접속
ssh -i your-key.pem ubuntu@your-instance-ip

# Node.js 설치
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 프로젝트 클론
git clone https://github.com/100BillionAds/main-repo.git
cd main-repo/10badv

# 의존성 설치
npm install

# 빌드
npm run build

# PM2로 실행
npm install -g pm2
pm2 start npm --name "10badv" -- start
pm2 save
pm2 startup
```

## 📋 배포 전 체크리스트

- [ ] 모든 테스트 통과 (`npm test`)
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
