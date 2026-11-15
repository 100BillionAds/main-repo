#!/usr/bin/env bash
# Oracle Cloud Ubuntu 서버 최초 설정 스크립트
# 사용: 서버에 SSH 로 접속한 뒤
#   curl -fsSL https://raw.githubusercontent.com/100BillionAds/main-repo/main/deploy/oracle-setup.sh | bash
#
# 하는 일
#   1. Docker 설치, 현재 사용자를 docker 그룹에 추가
#   2. Oracle Ubuntu 이미지의 iptables 가 막고 있는 80/443 포트 개방 (재부팅 후에도 유지)
#   3. ~/10badv 폴더에 운영용 compose 파일과 Caddyfile 내려받기, .env 틀 생성
#   4. 디스크가 차지 않도록 매주 도커 정리 크론 등록
set -euo pipefail

REPO_RAW="https://raw.githubusercontent.com/100BillionAds/main-repo/main/10badv"
APP_DIR="$HOME/10badv"

echo "==> 1/4 Docker 설치"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo usermod -aG docker "$USER"

echo "==> 2/4 방화벽(iptables) 80/443 개방"
for port in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
    sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$port" -j ACCEPT
  fi
done
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent >/dev/null
sudo netfilter-persistent save

echo "==> 3/4 배포 폴더 준비: $APP_DIR"
mkdir -p "$APP_DIR"
cd "$APP_DIR"
curl -fsSL "$REPO_RAW/docker-compose.prod.yml" -o docker-compose.prod.yml
curl -fsSL "$REPO_RAW/Caddyfile" -o Caddyfile

if [ ! -f .env ]; then
  cat > .env <<ENV
# ---- 반드시 채울 값 ----
DOMAIN=
APP_IMAGE=ghcr.io/100billionads/main-repo:latest

# ---- 자동 생성된 비밀값 (그대로 두면 됨) ----
DATABASE_USER=app
DATABASE_NAME=tenbadv
DATABASE_PASSWORD=$(openssl rand -hex 24)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -hex 32)

# ---- 에스크로 정책 ----
ESCROW_AUTO_CONFIRM_DAYS=7
ESCROW_AUTO_CANCEL_DAYS=7
ESCROW_COMMISSION_RATE=0.1
SETTLEMENT_INTERVAL_MINUTES=10

# ---- 결제 (포트원 테스트 채널) ----
PORTONE_API_SECRET=

# ---- 파일 업로드 (Cloudinary) ----
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ENV
  chmod 600 .env
  echo "    .env 를 만들었습니다. DOMAIN 등 빈 값을 채우세요: nano $APP_DIR/.env"
else
  echo "    기존 .env 를 유지합니다."
fi

echo "==> 4/4 주간 도커 정리 크론 등록"
( crontab -l 2>/dev/null | grep -v 'docker system prune' ; echo "0 4 * * 0 docker system prune -af --filter 'until=168h' >/dev/null 2>&1" ) | crontab -

echo
echo "완료. 다음 순서:"
echo "  1) 로그아웃 후 다시 SSH 접속 (docker 그룹 적용)"
echo "  2) nano $APP_DIR/.env 로 DOMAIN 등 입력"
echo "  3) cd $APP_DIR && docker compose -f docker-compose.prod.yml up -d"
echo "  4) https://<DOMAIN>/api/health 확인"
