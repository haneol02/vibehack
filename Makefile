.PHONY: build up down logs restart deploy deploy-vps nginx-conf nginx-reload shell-dashboard register-commands

build:
	docker build -t vibehack-session-runner ./session-runner
	docker build -t vibehack-app-runner ./app-runner
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

restart:
	docker-compose restart

shell-dashboard:
	docker-compose exec dashboard sh

register-commands:
	docker-compose exec bot node src/register-commands.js

# Nginx 설정 생성 (.env DOMAIN 기반)
nginx-conf:
	bash scripts/gen-nginx-conf.sh

# Nginx 재로드 (설정 변경 후)
nginx-reload:
	docker-compose exec nginx nginx -s reload

# 로컬 배포
deploy: nginx-conf build up register-commands
	@echo "VibHack deployed!"

# VPS 원클릭 배포
deploy-vps:
	sudo bash scripts/deploy-vps.sh

# VPS 서버 초기화 (최초 1회)
init-server:
	sudo bash scripts/init-server.sh
