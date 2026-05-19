#!/bin/bash
set -e

APP_DIR="/opt/workship"
REPO_URL="$1"

if [ -z "$REPO_URL" ]; then
  echo "Usage: ./deploy.sh <github-repo-url>"
  echo "Example: ./deploy.sh https://github.com/username/personal-workship.git"
  exit 1
fi

echo "=== Installing Docker ==="
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  apt-get update && apt-get install -y docker-compose-plugin
fi

echo "=== Cloning repository ==="
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git pull
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "=== Setting up environment ==="
if [ ! -f .env ]; then
  SESSION_PW=$(openssl rand -base64 32)
  cat > .env << EOF
DATABASE_URL="file:./dev.db"
SESSION_PASSWORD="$SESSION_PW"
NODE_ENV="production"
EOF
  echo "Created .env with random SESSION_PASSWORD"
fi

echo "=== Creating data directory ==="
mkdir -p data/db

echo "=== Building and starting ==="
docker compose up -d --build

echo ""
echo "=== Done! ==="
echo "Access at: http://$(curl -s ifconfig.me):3000"
echo "First visit will show the admin setup page."
