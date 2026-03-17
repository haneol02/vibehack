#!/bin/bash
set -e

echo "=== VibHack Setup ==="

# Check .env exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example - please edit it!"
    exit 1
fi

# Create required directories
mkdir -p projects data nginx/conf.d

# Build images
echo "Building Docker images..."
docker build -t vibehack-session-runner ./session-runner
docker build -t vibehack-app-runner ./app-runner

# Start services
echo "Starting services..."
docker-compose up -d redis dashboard

# Wait for dashboard
echo "Waiting for dashboard..."
sleep 5

# Start bot and nginx
docker-compose up -d bot nginx

echo ""
echo "=== VibHack is running! ==="
echo "Dashboard: http://$(grep DOMAIN .env | cut -d= -f2)"
echo ""
echo "To register Discord slash commands:"
echo "  make register-commands"
