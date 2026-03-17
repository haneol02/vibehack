#!/bin/bash
set -e

echo "==============================="
echo "  VibHack VPS 초기화 스크립트"
echo "==============================="

# Root 권한 확인
if [ "$EUID" -ne 0 ]; then
    echo "Error: root 권한으로 실행하세요 (sudo bash scripts/init-server.sh)"
    exit 1
fi

# 1. 시스템 업데이트
echo ""
echo "[1/5] 시스템 업데이트..."
apt-get update && apt-get upgrade -y

# 2. 필수 패키지 설치
echo ""
echo "[2/5] 필수 패키지 설치..."
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    make \
    ufw \
    certbot

# 3. Docker 설치
echo ""
echo "[3/5] Docker 설치..."
if command -v docker &> /dev/null; then
    echo "Docker 이미 설치됨: $(docker --version)"
else
    # Docker 공식 GPG 키 추가
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    # Docker 저장소 추가
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # docker compose v2 심볼릭 링크 (docker-compose 호환)
    if ! command -v docker-compose &> /dev/null; then
        ln -sf /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose
    fi

    systemctl enable docker
    systemctl start docker
    echo "Docker 설치 완료: $(docker --version)"
fi

# 4. 방화벽 설정
echo ""
echo "[4/5] 방화벽 설정..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "방화벽 활성화: SSH(22), HTTP(80), HTTPS(443) 허용"

# 5. 디렉토리 생성
echo ""
echo "[5/5] 프로젝트 디렉토리 설정..."
mkdir -p projects data nginx/conf.d

echo ""
echo "==============================="
echo "  초기화 완료!"
echo "==============================="
echo ""
echo "다음 단계:"
echo "  1. .env 파일 작성:  cp .env.example .env && nano .env"
echo "  2. 배포 실행:       make deploy-vps"
echo ""
