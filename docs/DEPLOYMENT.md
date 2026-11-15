# 배포 가이드

이 서비스는 커스텀 서버(`server.js`)가 Next.js, Socket.io 채팅, 에스크로 자동정산 스케줄러를 한 프로세스에서 실행합니다. 그래서 상시 실행되는 컨테이너가 필요하고, **현재 운영은 Railway** 에서 합니다.

| 방식 | 채팅 | 자동정산 | 비용 | 상태 |
|------|------|----------|------|------|
| Railway (현재) | 됨 | 내장 스케줄러, 10분 주기 | Hobby 월 5달러부터 + 사용량 | 운영 |
| Docker + 자체 서버 | 됨 | 내장 스케줄러 | 서버 비용 | 이전 대안 (2장) |
| Vercel | 안 됨 | Vercel Cron, 하루 1회 | 무료부터 | 사용 안 함 (3장) |

## 0. Railway 배포 (현재 운영)

Railway 가 GitHub 저장소를 감시하다가 `main` 에 머지되면 `10badv/Dockerfile` 로 이미지를 빌드해 배포합니다. 설정은 `10badv/railway.json` 에 있습니다 (Dockerfile 빌드, `/api/health` 헬스체크, 실패 시 재시작).

### 0-1. 프로젝트 구성 (최초 1회)

1. Railway 에 GitHub 계정으로 로그인하고 Hobby 플랜을 선택합니다.
2. New Project → Deploy from GitHub repo → `100BillionAds/main-repo`
3. 만들어진 서비스의 Settings 에서
   - **Root Directory**: `/10badv`
   - **Branch**: `main`
   - **Wait for CI**: 켬 (GitHub CI 가 통과한 커밋만 배포)
   - **Region**: 사용자와 가까운 아시아 리전
4. 같은 프로젝트에 New → Database → **MySQL** 을 추가합니다.
5. 앱 서비스의 Variables 에 아래를 넣습니다. `${{ }}` 는 Railway 가 다른 서비스 값으로 바꿔 넣는 참조 문법입니다.

```
DATABASE_URL=${{MySQL.MYSQL_URL}}
NEXTAUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
NEXTAUTH_SECRET=<openssl rand -base64 32>
CRON_SECRET=<openssl rand -hex 32>
SETTLEMENT_INTERVAL_MINUTES=10
ESCROW_AUTO_CONFIRM_DAYS=7
ESCROW_AUTO_CANCEL_DAYS=7
ESCROW_COMMISSION_RATE=0.1
```

결제와 파일 업로드를 쓸 때 추가합니다.

```
PORTONE_API_SECRET=...
NEXT_PUBLIC_PORTONE_STORE_ID=...       # 빌드 시점 값. 바꾸면 재배포 필요
NEXT_PUBLIC_PORTONE_CHANNEL_KEY=...
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

6. Settings → Networking → Generate Domain 으로 공개 주소(`*.up.railway.app`)를 만듭니다. 나중에 Custom Domain 으로 자기 도메인을 연결할 수 있습니다.
7. 첫 배포가 끝나면 아래 "배포 후 확인" 을 진행합니다.

### 0-2. 알아둘 점

- **컨테이너 디스크는 배포마다 초기화됩니다.** 업로드 파일은 Cloudinary(또는 S3)에 저장해야 남습니다. DB 데이터는 MySQL 서비스의 볼륨에 있으므로 유지됩니다.
- **복제본은 1개로 둡니다** (`numReplicas: 1`). 채팅 소켓이 한 프로세스 안에서만 공유되기 때문입니다. 여러 개로 늘리려면 Socket.io Redis 어댑터가 필요합니다 (로드맵 4단계).
- **비용**: Hobby 는 월 5달러가 최소 사용료이고 그만큼의 사용량이 포함됩니다. 앱과 MySQL 이 상시 실행되므로 사용량에 따라 그보다 더 나올 수 있습니다. Railway 대시보드의 Usage 에서 확인하고, Usage Limits 로 상한을 걸어 둡니다.
- **되돌리기**: 서비스의 Deployments 목록에서 이전 배포를 골라 Redeploy 합니다.
- **백업**: MySQL 서비스의 Backups 탭에서 자동 백업 일정을 켭니다. 직접 받아 두려면 MySQL 서비스 Variables 의 공개 접속 정보(`MYSQLHOST` 대신 TCP Proxy 주소와 포트)로 `mysqldump --single-transaction` 을 실행합니다.

## 1. 로컬에서 Docker 로 실행

```bash
cd 10badv
cp .env.example .env.local     # 값 수정 (아래 "환경변수" 참고)
docker compose up --build
# http://localhost:3000
```

앱 컨테이너와 MySQL 컨테이너가 함께 뜹니다. 테이블은 앱이 시작될 때 자동으로 만들어집니다.

## 2. 자체 서버 배포 (Docker + GHCR + Caddy) — 대안

구성: GitHub Actions 가 이미지를 만들어 GHCR 에 올리고, 서버에 SSH 로 접속해 새 이미지로 교체합니다. 서버에서는 Caddy 가 HTTPS 인증서를 자동 발급하고 앱으로 연결합니다.

```
GitHub (main 머지)
  └─ ci (lint, test, build)
       └─ cd: 이미지 빌드 → ghcr.io/100billionads/main-repo
                └─ SSH → 서버: docker compose pull && up -d

서버
  Caddy (:80, :443, HTTPS 자동) → app (:3000) → MySQL
```

Railway 와 같은 Docker 이미지를 쓰므로, 서버로 옮길 때는 DB 덤프를 옮기고 도메인만 바꾸면 됩니다. 이 경우 `.github/workflows/cd.yml` 을 수동 실행하거나 트리거를 다시 켭니다.

### 2-0. Oracle Cloud 무료 서버

가입이 자동 심사에서 거절되는 경우가 많습니다.

**알아둘 제약**
- 무료 ARM(Ampere A1) 한도는 합계 2 OCPU, 12GB 메모리입니다 (2026년 6월에 절반으로 줄었음).
- 7일 동안 CPU, 네트워크, 메모리 사용률이 모두 20% 미만이면 유휴 서버로 보고 회수할 수 있습니다. 사용자가 적은 초기에는 CPU 가 거의 안 쓰이므로, **메모리를 4GB 로 작게 잡아** 메모리 사용률을 20% 위로 유지합니다 (MySQL + 앱 + Caddy 가 약 1.2~1.5GB).
- 지역에 따라 ARM 서버 재고가 없어 생성이 실패할 수 있습니다. 시간을 두고 다시 시도합니다.
- 서버가 ARM 이므로 CD 가 amd64/arm64 이미지를 함께 빌드합니다.
- SLA 가 없습니다. 2-4 의 백업을 꼭 설정합니다.

**순서**
1. Oracle Cloud 가입 (카드 인증 필요, 과금은 되지 않음). 홈 리전은 나중에 바꿀 수 없으니 `South Korea Central (Seoul)` 또는 `South Korea North (Chuncheon)` 를 고릅니다.
2. Compute → Instances → Create instance
   - Image: Canonical Ubuntu 24.04
   - Shape: `VM.Standard.A1.Flex`, **OCPU 2, Memory 4GB**
   - SSH 키: "Generate a key pair" 로 만들고 개인키를 내려받아 보관 (CD 의 `DEPLOY_SSH_KEY` 로도 사용)
   - Public IP 할당
3. 인스턴스의 Subnet → Security List → Ingress Rules 에 TCP 80, 443 을 `0.0.0.0/0` 으로 추가합니다.
4. 도메인 연결. 도메인이 없으면 무료 서브도메인(DuckDNS 등)으로 시작해도 됩니다. A 레코드를 서버 공인 IP 로 지정합니다.
5. 서버에 접속해 설정 스크립트를 실행합니다. Oracle 의 Ubuntu 이미지는 iptables 가 80/443 을 막고 있어서, 스크립트가 이를 열어 줍니다.

```bash
ssh -i <개인키> ubuntu@<서버 IP>
curl -fsSL https://raw.githubusercontent.com/100BillionAds/main-repo/main/deploy/oracle-setup.sh | bash
# 로그아웃 후 다시 접속
nano ~/10badv/.env          # DOMAIN 등 빈 값 입력 (비밀값은 자동 생성됨)
cd ~/10badv && docker compose -f docker-compose.prod.yml up -d
```

6. GitHub 패키지(`ghcr.io/100billionads/main-repo`)를 Public 으로 바꾸면 서버에서 `docker login` 없이 이미지를 받을 수 있습니다. 저장소가 공개라 이미지에 숨길 것은 없습니다 (비밀값은 모두 서버 `.env` 에 있음).
7. 아래 2-2 대로 자동 배포를 켭니다. `DEPLOY_USER` 는 `ubuntu` 입니다.

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

`cd` 워크플로는 현재 수동 실행(workflow_dispatch)만 켜져 있습니다. 자체 서버로 옮기면 `on:` 에 `workflow_run` 트리거를 다시 추가합니다. `DEPLOY_ENABLED` 를 설정하지 않으면 이미지만 올리고 배포는 건너뜁니다.

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
- [ ] 앱 로그(Railway: Deployments → View logs)에 `자동정산 스케줄러 시작` 이 보인다
- [ ] 회원가입, 로그인이 된다
- [ ] 포인트 충전 → 포트폴리오 구매 → 작업 시작 → 작업 완료 → 구매확정까지 진행되고 디자이너 포인트가 늘어난다
- [ ] 두 계정으로 채팅이 실시간으로 오간다
- [ ] 관리자로 로그인해 `POST /api/cron/settle` 을 호출하면 결과가 온다

## CI/CD

| 워크플로 | 시점 | 하는 일 |
|----------|------|---------|
| `.github/workflows/ci.yml` | PR, main/develop 푸시 | lint, 단위 테스트, 빌드, MySQL 통합 테스트 |
| Railway | main 푸시 + CI 통과 (Wait for CI) | 이미지 빌드, 배포, 헬스체크 |
| `.github/workflows/cd.yml` | 수동 | 자체 서버용 이미지 빌드·푸시, SSH 배포 |

## 문제 해결

| 증상 | 확인할 것 |
|------|-----------|
| 쓰기 요청이 503 | DB 환경변수가 비어 있어 클로즈드 테스트 모드. `.env` 확인 |
| 채팅 연결이 바로 끊김 | 로그인 상태인지, `NEXTAUTH_SECRET` 이 설정됐는지, `NEXT_PUBLIC_SOCKET_URL` 이 접속 주소와 같은지 |
| 자동정산이 안 돎 | `CRON_SECRET` 설정 여부, 앱 로그의 `자동정산` 줄 |
| 결제창이 안 뜸 | `NEXT_PUBLIC_PORTONE_*` 를 저장소 Variables 에 넣고 이미지를 다시 빌드했는지 |
| HTTPS 인증서 발급 실패 | 도메인 A 레코드, 80/443 포트 개방, `docker compose logs caddy` |
