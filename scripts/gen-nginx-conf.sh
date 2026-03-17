#!/bin/bash
set -e

# .env에서 DOMAIN 읽기
if [ ! -f .env ]; then
    echo "Error: .env 파일이 없습니다."
    exit 1
fi

DOMAIN=$(grep '^DOMAIN=' .env | cut -d= -f2 | tr -d ' \r')

if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "yourdomain.com" ]; then
    echo "Error: .env에서 DOMAIN을 실제 도메인으로 설정하세요."
    exit 1
fi

echo "Generating nginx config for: $DOMAIN"

sed "s/{{DOMAIN}}/$DOMAIN/g" \
    nginx/conf.d/default.conf.template > nginx/conf.d/default.conf

echo "  -> nginx/conf.d/default.conf 생성 완료"
