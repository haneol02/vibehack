#!/bin/bash
set -e

echo "==============================="
echo "  VibHack 원클릭 VPS 배포"
echo "==============================="

# Root 권한 확인
if [ "$EUID" -ne 0 ]; then
    echo "Error: root 권한으로 실행하세요 (sudo bash scripts/deploy-vps.sh)"
    exit 1
fi

# .env 확인
if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "==============================="
    echo "  .env 파일이 생성되었습니다!"
    echo "  아래 값들을 채워주세요:"
    echo "==============================="
    echo ""
    cat .env
    echo ""
    echo "편집: nano .env"
    echo "편집 후 다시 실행: sudo bash scripts/deploy-vps.sh"
    exit 1
fi

# 필수 값 검증
DOMAIN=$(grep '^DOMAIN=' .env | cut -d= -f2 | tr -d ' \r')
DISCORD_TOKEN=$(grep '^DISCORD_TOKEN=' .env | cut -d= -f2 | tr -d ' \r')
ANTHROPIC_KEY=$(grep '^ANTHROPIC_API_KEY=' .env | cut -d= -f2 | tr -d ' \r')

MISSING=""
if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "yourdomain.com" ]; then
    MISSING="$MISSING\n  - DOMAIN"
fi
if [ -z "$DISCORD_TOKEN" ] || [ "$DISCORD_TOKEN" = "your_discord_bot_token" ]; then
    MISSING="$MISSING\n  - DISCORD_TOKEN"
fi

if [ -n "$MISSING" ]; then
    echo "Error: .env에 다음 값이 설정되지 않았습니다:"
    echo -e "$MISSING"
    echo ""
    echo "편집: nano .env"
    exit 1
fi

echo "도메인: $DOMAIN"
echo ""

# Step 1: 서버 초기화 (Docker 등)
echo "[1/5] 서버 초기화..."
if ! command -v docker &> /dev/null; then
    bash scripts/init-server.sh
else
    echo "  Docker 이미 설치됨, 건너뜀"
    mkdir -p projects data nginx/conf.d
fi

# Step 2: Nginx 설정 생성
echo ""
echo "[2/5] Nginx 설정 생성..."
bash scripts/gen-nginx-conf.sh

# Step 3: Docker 이미지 빌드
echo ""
echo "[3/5] Docker 이미지 빌드..."
docker build -t vibehack-session-runner ./session-runner
docker build -t vibehack-app-runner ./app-runner
docker-compose build

# Step 4: 서비스 시작
echo ""
echo "[4/5] 서비스 시작..."
docker-compose up -d

# Step 5: 디스코드 봇 커맨드 등록
echo ""
echo "[5/5] 디스코드 슬래시 커맨드 등록..."
sleep 5
docker-compose exec -T bot node src/register-commands.js || echo "  경고: 커맨드 등록 실패 (나중에 make register-commands로 재시도)"

echo ""
echo "==============================="
echo "  VibHack 배포 완료!"
echo "==============================="
echo ""
echo "  대시보드:  https://$DOMAIN"
echo "  앱 프리뷰: https://test.$DOMAIN"
echo ""
echo "유용한 명령어:"
echo "  make logs     - 로그 보기"
echo "  make restart  - 서비스 재시작"
echo ""
