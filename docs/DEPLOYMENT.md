# 배포 가이드

이 서비스는 커스텀 서버(`server.js`)가 Next.js, Socket.io 채팅, 에스크로 자동정산 스케줄러를 한 프로세스에서 실행합니다. 그래서 **Docker 로 서버 한 대에 올리는 방식을 권장**합니다. Vercel 은 화면과 API 는 되지만 실시간 채팅(WebSocket)이 되지 않습니다.

| 방식 | 채팅 | 자동정산 | 비용 |
|------|------|----------|------|
| Docker + 서버 한 대 (권장) | 됨 | 내장 스케줄러, 10분 주기 | 서버 비용 (무료 티어 가능) |
| Vercel | 안 됨 (별도 소켓 서버 필요) | Vercel Cron, 하루 1회 | 무료부터 |

## 1. 로컬에서 Docker 로 실행

```bash
cd 10badv
cp .env.example .env.local     # 값 수정 (아래 "환경변수" 참고)
docker compose up --build
# http://localhost:3000
```

앱 컨테이너와 MySQL 컨테이너가 함께 뜹니다. 테이블은 앱이 시작될 때 자동으로 만들어집니다.

## 2. 서버 배포 (Docker + GHCR + Caddy)

구성: GitHub Actions 가 이미지를 만들어 GHCR 에 올리고, 서버에 SSH 로 접속해 새 이미지로 교체합니다. 서버에서는 Caddy 가 HTTPS 인증서를 자동 발급하고 앱으로 연결합니다.

```
GitHub (main 머지)
  └─ ci (lint, test, build)
       └─ cd: 이미지 빌드 → ghcr.io/100billionads/main-repo
                └─ SSH → 서버: docker compose pull && up -d

서버
  Caddy (:80, :443, HTTPS 자동) → app (:3000) → MySQL
```

### 2-1. 서버 준비 (최초 1회)

1. Ubuntu 서버를 준비합니다 (Oracle Cloud 무료 티어, AWS EC2, 일반 VPS 등). 80, 443 포트를 엽니다.
2. 도메인의 A 레코드를 서버 IP 로 연결합니다.
3. Docker 를 설치합니다: `curl -fsSL https://get.docker.com | sh`
4. 배포 폴더를 만들고 파일을 복사합니다.

```bash
mkdir -p ~/10badv && cd ~/10badv
# 저장소의 10badv/docker-compose.prod.yml, 10badv/Caddyfile 을 이 폴더에 복사
# 10badv/.env.example 을 참고해 .env 작성
```

5. `.env` 에 최소한 아래 값을 채웁니다.

```bash
APP_IMAGE=ghcr.io/100billionads/main-repo:latest
DOMAIN=your-domain.com
DATABASE_USER=app
DATABASE_PASSWORD=<openssl rand -hex 24>
MYSQL_ROOT_PASSWORD=<openssl rand -hex 24>
DATABASE_NAME=tenbadv
NEXTAUTH_SECRET=<openssl rand -base64 32>
CRON_SECRET=<openssl rand -hex 32>
PORTONE_API_SECRET=<포트원 V2 API Secret>
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

6. GHCR 이미지가 비공개면 서버에서 한 번 로그인합니다: `docker login ghcr.io` (read:packages 권한의 토큰 사용)
7. 처음 한 번 수동으로 띄워 확인합니다.

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml logs -f app
```

### 2-2. 자동 배포 켜기

저장소 Settings → Secrets and variables → Actions 에서 설정합니다.

| 종류 | 이름 | 값 |
|------|------|-----|
| Variable | `DEPLOY_ENABLED` | `true` |
| Variable | `NEXT_PUBLIC_PORTONE_STORE_ID` | 포트원 스토어 ID (공개 값) |
| Variable | `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | 포트원 채널 키 (공개 값) |
| Secret | `DEPLOY_HOST` | 서버 IP 또는 도메인 |
| Secret | `DEPLOY_USER` | SSH 사용자 |
| Secret | `DEPLOY_SSH_KEY` | SSH 개인키 |

`NEXT_PUBLIC_*` 값은 이미지 빌드 시점에 화면 코드에 포함되므로 서버의 `.env` 가 아니라 여기에 넣어야 합니다.

이후 `main` 에 머지되면 `ci` → `cd` 순으로 실행되어 자동 배포됩니다. `DEPLOY_ENABLED` 를 설정하지 않으면 이미지만 올리고 배포는 건너뜁니다.

### 2-3. 되돌리기

이미지에는 `latest` 와 커밋 해시 태그가 함께 붙습니다. 서버의 `.env` 에서 `APP_IMAGE` 를 이전 해시 태그로 바꾸고 `docker compose -f docker-compose.prod.yml up -d` 를 실행합니다.

### 2-4. 백업

```bash
docker compose -f docker-compose.prod.yml exec db \
  sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction "$MYSQL_DATABASE"' > backup-$(date +%F).sql
```

돈이 오가는 서비스이므로 정기 백업을 권합니다.

## 3. Vercel 배포

1. Vercel 에서 저장소를 가져오고 Root Directory 를 `10badv` 로 지정합니다.
2. 환경변수를 Vercel 대시보드에 등록합니다. DB 는 외부 MySQL(TiDB Serverless 등)을 쓰고 `DATABASE_SSL=true` 로 둡니다.
3. `CRON_SECRET` 을 등록하면 `vercel.json` 의 크론이 하루 한 번 자동정산을 실행합니다. Hobby 플랜은 하루 1회까지만 허용됩니다.
4. 실시간 채팅은 동작하지 않습니다. 필요하면 `server.js` 를 별도 서버에 띄우고 `NEXT_PUBLIC_SOCKET_URL` 을 그 주소로 지정해야 하는데, 이 경우 세션 쿠키가 같은 상위 도메인을 공유해야 소켓 인증이 됩니다.

DB 환경변수가 없는 상태로 배포하면 클로즈드 테스트 모드가 되어 쓰기 기능이 모두 막힙니다 (`10badv/README.md` 참고).

## 환경변수

전체 목록과 발급 방법은 `10badv/.env.example` 에 있습니다.

| 이름 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` 또는 `DATABASE_HOST/PORT/USER/PASSWORD/NAME` | 예 | MySQL 접속 정보. compose 사용 시 HOST 는 자동으로 `db` |
| `NEXTAUTH_SECRET` | 예 | 세션 서명 키. 소켓 인증에도 사용 |
| `NEXTAUTH_URL` | 예 | 서비스 주소. prod compose 는 `DOMAIN` 에서 자동 설정 |
| `CRON_SECRET` | 권장 | 자동정산 API 비밀값. 없으면 내장 스케줄러가 꺼짐 |
| `SETTLEMENT_INTERVAL_MINUTES` | 아니오 | 스케줄러 주기 (기본 10) |
| `ESCROW_AUTO_CONFIRM_DAYS`, `ESCROW_AUTO_CANCEL_DAYS`, `ESCROW_COMMISSION_RATE` | 아니오 | 에스크로 정책 ([ESCROW.md](./ESCROW.md)) |
| `PORTONE_API_SECRET` | 결제 사용 시 | 포트원 V2 API Secret |
| `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` | 결제 사용 시 | 빌드 시점 값 |
| `STORAGE_PROVIDER`, `CLOUDINARY_*` 또는 `AWS_*` | 업로드 사용 시 | 파일 저장소 |

## 배포 후 확인

- [ ] `https://도메인/api/health` 가 `{"status":"ok"}` 를 반환한다
- [ ] 앱 로그에 `자동정산 스케줄러 시작` 이 보인다
- [ ] 회원가입, 로그인이 된다
- [ ] 포인트 충전 → 포트폴리오 구매 → 작업 시작 → 작업 완료 → 구매확정까지 진행되고 디자이너 포인트가 늘어난다
- [ ] 두 계정으로 채팅이 실시간으로 오간다
- [ ] 관리자로 로그인해 `POST /api/cron/settle` 을 호출하면 결과가 온다

## CI/CD

| 워크플로 | 시점 | 하는 일 |
|----------|------|---------|
| `.github/workflows/ci.yml` | PR, main/develop 푸시 | lint, 단위 테스트, 빌드, MySQL 통합 테스트 |
| `.github/workflows/cd.yml` | main 에서 ci 성공 후, 또는 수동 | 이미지 빌드·푸시, 서버 배포 |

## 문제 해결

| 증상 | 확인할 것 |
|------|-----------|
| 쓰기 요청이 503 | DB 환경변수가 비어 있어 클로즈드 테스트 모드. `.env` 확인 |
| 채팅 연결이 바로 끊김 | 로그인 상태인지, `NEXTAUTH_SECRET` 이 설정됐는지, `NEXT_PUBLIC_SOCKET_URL` 이 접속 주소와 같은지 |
| 자동정산이 안 돎 | `CRON_SECRET` 설정 여부, 앱 로그의 `자동정산` 줄 |
| 결제창이 안 뜸 | `NEXT_PUBLIC_PORTONE_*` 를 저장소 Variables 에 넣고 이미지를 다시 빌드했는지 |
| HTTPS 인증서 발급 실패 | 도메인 A 레코드, 80/443 포트 개방, `docker compose logs caddy` |
