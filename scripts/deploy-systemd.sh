#!/usr/bin/env bash
set -Eeuo pipefail

# Standard systemd deployment for Personal Workship.
# Passwords and secrets must be provided through SSH agent, key files, or the
# remote environment. Do not put passwords in this script.
#
# Local variables:
#   SSH_HOST          Remote host or IP. Defaults to the current Tencent Cloud server.
#   SSH_USER          Remote Linux user.
#   SSH_PORT          SSH port.
#   SSH_KEY           Optional private key path, for example ~/.ssh/id_ed25519.
#   LOCAL_ROOT        Local project root. Defaults to this script's parent.
#   RELEASE_NAME      Upload archive name. Defaults to a timestamped tarball.
#
# Server variables:
#   REMOTE_APP_DIR    Current app checkout/build directory.
#   REMOTE_DATA_DIR   Persistent data directory.
#   REMOTE_DB_PATH    SQLite database path to back up before deployment.
#   APP_SERVICE       systemd app service to restart and verify.
#   WEB_SERVICE       second systemd service to verify, usually nginx.
#   BASE_URL          Public nginx URL used for endpoint verification.

SSH_HOST="${SSH_HOST:-1.117.58.118}"
SSH_USER="${SSH_USER:-ubuntu}"
SSH_PORT="${SSH_PORT:-22}"
SSH_KEY="${SSH_KEY:-}"
LOCAL_ROOT="${LOCAL_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
RELEASE_NAME="${RELEASE_NAME:-personal-workship-$(date +%Y%m%d-%H%M%S).tar.gz}"

REMOTE_APP_DIR="${REMOTE_APP_DIR:-/home/ubuntu/personal-workship}"
REMOTE_DATA_DIR="${REMOTE_DATA_DIR:-/home/ubuntu/personal-workship-data}"
REMOTE_DB_PATH="${REMOTE_DB_PATH:-/home/ubuntu/personal-workship-data/dev.db}"
APP_SERVICE="${APP_SERVICE:-personal-workship.service}"
WEB_SERVICE="${WEB_SERVICE:-nginx.service}"
BASE_URL="${BASE_URL:-http://127.0.0.1}"

REMOTE_RELEASE="/tmp/${RELEASE_NAME}"
LOCAL_RELEASE="${TMPDIR:-/tmp}/${RELEASE_NAME}"

if [[ -z "$SSH_HOST" ]]; then
  echo "SSH_HOST is required." >&2
  exit 1
fi

SSH_ARGS=(-p "$SSH_PORT")
SCP_ARGS=(-P "$SSH_PORT")
if [[ -n "$SSH_KEY" ]]; then
  SSH_ARGS+=(-i "$SSH_KEY")
  SCP_ARGS+=(-i "$SSH_KEY")
fi

remote="${SSH_USER}@${SSH_HOST}"

cleanup() {
  rm -f "$LOCAL_RELEASE"
}
trap cleanup EXIT

echo "Creating upload package: $LOCAL_RELEASE"
tar \
  --exclude='.git' \
  --exclude='.next' \
  --exclude='node_modules' \
  --exclude='backups/*.sqlite' \
  --exclude='scratch' \
  -czf "$LOCAL_RELEASE" \
  -C "$LOCAL_ROOT" .

echo "Preparing remote directories and backing up SQLite database"
ssh "${SSH_ARGS[@]}" "$remote" \
  "REMOTE_DATA_DIR='$REMOTE_DATA_DIR' REMOTE_DB_PATH='$REMOTE_DB_PATH' bash -s" <<'REMOTE_BACKUP'
set -Eeuo pipefail
mkdir -p "$REMOTE_DATA_DIR/backups"
stamp="$(date +%Y%m%d-%H%M%S)"
if [[ -f "$REMOTE_DB_PATH" ]]; then
  cp "$REMOTE_DB_PATH" "$REMOTE_DATA_DIR/backups/pre-deploy-${stamp}.sqlite"
  for suffix in -wal -shm -journal; do
    if [[ -f "${REMOTE_DB_PATH}${suffix}" ]]; then
      cp "${REMOTE_DB_PATH}${suffix}" "$REMOTE_DATA_DIR/backups/pre-deploy-${stamp}.sqlite${suffix}"
    fi
  done
  echo "Database backup created under $REMOTE_DATA_DIR/backups"
else
  echo "No existing database at $REMOTE_DB_PATH; skipping database backup"
fi
REMOTE_BACKUP

echo "Uploading package to $remote:$REMOTE_RELEASE"
scp "${SCP_ARGS[@]}" "$LOCAL_RELEASE" "$remote:$REMOTE_RELEASE"

echo "Installing, migrating, rebuilding, and restarting systemd service"
ssh "${SSH_ARGS[@]}" "$remote" \
  "REMOTE_RELEASE='$REMOTE_RELEASE' REMOTE_APP_DIR='$REMOTE_APP_DIR' REMOTE_DATA_DIR='$REMOTE_DATA_DIR' REMOTE_DB_PATH='$REMOTE_DB_PATH' APP_SERVICE='$APP_SERVICE' BASE_URL='$BASE_URL' bash -s" <<'REMOTE_DEPLOY'
set -Eeuo pipefail
mkdir -p "$REMOTE_APP_DIR"
tar -xzf "$REMOTE_RELEASE" -C "$REMOTE_APP_DIR"
cd "$REMOTE_APP_DIR"

mkdir -p "$(dirname "$REMOTE_DB_PATH")"
if [[ ! -f "$REMOTE_DB_PATH" && -f "$REMOTE_APP_DIR/.next/standalone/prisma/dev.db" ]]; then
  cp "$REMOTE_APP_DIR/.next/standalone/prisma/dev.db" "$REMOTE_DB_PATH"
fi

if [[ ! -f .env ]]; then
  session_password="$(openssl rand -base64 32)"
  cat > .env <<ENV
DATABASE_URL="file:$REMOTE_DB_PATH"
SESSION_PASSWORD="$session_password"
NEXT_PUBLIC_APP_URL="$BASE_URL"
NODE_ENV="production"
ENV
else
  if grep -q '^DATABASE_URL=' .env; then
    sed -i "s#^DATABASE_URL=.*#DATABASE_URL=\"file:$REMOTE_DB_PATH\"#" .env
  else
    printf '\nDATABASE_URL="file:%s"\n' "$REMOTE_DB_PATH" >> .env
  fi
  if grep -q '^NEXT_PUBLIC_APP_URL=' .env; then
    sed -i "s#^NEXT_PUBLIC_APP_URL=.*#NEXT_PUBLIC_APP_URL=\"$BASE_URL\"#" .env
  else
    printf 'NEXT_PUBLIC_APP_URL="%s"\n' "$BASE_URL" >> .env
  fi
fi

npm ci
export DATABASE_URL="file:$REMOTE_DB_PATH"
npx prisma generate
npx prisma migrate deploy
npm run build

mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static
cp .env .next/standalone/.env

sudo systemctl restart "$APP_SERVICE"
sudo systemctl --no-pager --full status "$APP_SERVICE"
REMOTE_DEPLOY

echo "Verifying endpoints and systemd services"
ssh "${SSH_ARGS[@]}" "$remote" \
  "REMOTE_APP_DIR='$REMOTE_APP_DIR' BASE_URL='$BASE_URL' APP_SERVICE='$APP_SERVICE' WEB_SERVICE='$WEB_SERVICE' bash -s" <<'REMOTE_VERIFY'
set -Eeuo pipefail
for path in /login /api/auth/init /health; do
  curl -fsS --max-time 15 "$BASE_URL$path" >/dev/null
  echo "OK $path"
done
cd "$REMOTE_APP_DIR"
npm run data:health >/dev/null
echo "OK /api/data-health"

systemctl is-active --quiet "$APP_SERVICE"
echo "OK $APP_SERVICE"
systemctl is-active --quiet "$WEB_SERVICE"
echo "OK $WEB_SERVICE"
REMOTE_VERIFY

echo "Deployment complete."
