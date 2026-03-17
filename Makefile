.PHONY: build up down logs restart deploy

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

deploy: build up register-commands
	@echo "VibHack deployed!"

ssl-setup:
	certbot certonly --dns-cloudflare \
		--dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
		-d $(DOMAIN) -d "*.$(DOMAIN)"
