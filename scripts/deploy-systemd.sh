#!/usr/bin/env bash
set -Eeuo pipefail

# Standard systemd deployment for Personal Workship.
# Passwords and secrets must be provided through SSH agent, key files, or the
# remote environment. Do not put passwords in this script.
#
# Local variables:
#   SSH_HOST          Remote host or IP. Required; do not hardcode production IPs.
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
#   REMOTE_APP_BACKUP_DIR  Previous app snapshots used for manual rollback.
#   APP_SERVICE       systemd app service to restart and verify.
#   WEB_SERVICE       second systemd service to verify, usually nginx.
#   LICENSE_SERVICE   license service to verify.
#   APP_PORT          Local port used by the standalone Next.js service.
#   BASE_URL          Public nginx URL used for endpoint verification.
#   SUDO_PASSWORD     Optional sudo password for servers without passwordless sudo.

SSH_HOST="${SSH_HOST:-}"
SSH_USER="${SSH_USER:-ubuntu}"
SSH_PORT="${SSH_PORT:-22}"
SSH_KEY="${SSH_KEY:-}"
LOCAL_ROOT="${LOCAL_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
RELEASE_NAME="${RELEASE_NAME:-personal-workship-$(date +%Y%m%d-%H%M%S).tar.gz}"

REMOTE_APP_DIR="${REMOTE_APP_DIR:-/home/ubuntu/personal-workship}"
REMOTE_DATA_DIR="${REMOTE_DATA_DIR:-/home/ubuntu/personal-workship-data}"
REMOTE_DB_PATH="${REMOTE_DB_PATH:-/home/ubuntu/personal-workship-data/dev.db}"
REMOTE_APP_BACKUP_DIR="${REMOTE_APP_BACKUP_DIR:-$REMOTE_DATA_DIR/releases}"
APP_SERVICE="${APP_SERVICE:-personal-workship.service}"
WEB_SERVICE="${WEB_SERVICE:-nginx.service}"
LICENSE_SERVICE="${LICENSE_SERVICE:-mimo-license.service}"
APP_PORT="${APP_PORT:-3002}"
BASE_URL="${BASE_URL:-http://127.0.0.1}"
SUDO_PASSWORD="${SUDO_PASSWORD:-}"

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

if ! git -C "$LOCAL_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "LOCAL_ROOT must be a git checkout so deployment can package a clean HEAD." >&2
  exit 1
fi

for forbidden_path in .env .env.local .env.deploy prisma/dev.db prisma/dev.db-wal prisma/dev.db-shm; do
  if git -C "$LOCAL_ROOT" ls-files --error-unmatch "$forbidden_path" >/dev/null 2>&1; then
    echo "Refusing to deploy tracked sensitive or local data file: $forbidden_path" >&2
    exit 1
  fi
done

echo "Creating upload package from git HEAD: $LOCAL_RELEASE"
git -C "$LOCAL_ROOT" archive --format=tar HEAD | gzip > "$LOCAL_RELEASE"

echo "Preparing remote directories and backing up app/database snapshots"
ssh "${SSH_ARGS[@]}" "$remote" \
  "REMOTE_APP_DIR='$REMOTE_APP_DIR' REMOTE_DATA_DIR='$REMOTE_DATA_DIR' REMOTE_DB_PATH='$REMOTE_DB_PATH' REMOTE_APP_BACKUP_DIR='$REMOTE_APP_BACKUP_DIR' bash -s" <<'REMOTE_BACKUP'
set -Eeuo pipefail
mkdir -p "$REMOTE_DATA_DIR/backups"
mkdir -p "$REMOTE_APP_BACKUP_DIR"
stamp="$(date +%Y%m%d-%H%M%S)"

if [[ -d "$REMOTE_APP_DIR" ]]; then
  tar \
    --exclude='./node_modules' \
    --exclude='./.next/cache' \
    --exclude='./releases' \
    -czf "$REMOTE_APP_BACKUP_DIR/pre-deploy-app-${stamp}.tar.gz" \
    -C "$REMOTE_APP_DIR" .
  echo "App snapshot created under $REMOTE_APP_BACKUP_DIR"
fi

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
  "REMOTE_RELEASE='$REMOTE_RELEASE' REMOTE_APP_DIR='$REMOTE_APP_DIR' REMOTE_DATA_DIR='$REMOTE_DATA_DIR' REMOTE_DB_PATH='$REMOTE_DB_PATH' APP_SERVICE='$APP_SERVICE' APP_PORT='$APP_PORT' BASE_URL='$BASE_URL' SUDO_PASSWORD='$SUDO_PASSWORD' bash -s" <<'REMOTE_DEPLOY'
set -Eeuo pipefail

run_sudo() {
  if [[ -n "${SUDO_PASSWORD:-}" ]]; then
    printf '%s\n' "$SUDO_PASSWORD" | sudo -S -p '' "$@"
  else
    sudo -n "$@"
  fi
}

ensure_persistent_database() {
  mkdir -p "$(dirname "$REMOTE_DB_PATH")"
  if [[ -f "$REMOTE_DB_PATH" ]]; then
    return
  fi

  for candidate in "$REMOTE_APP_DIR/prisma/dev.db" "$REMOTE_APP_DIR/.next/standalone/prisma/dev.db"; do
    if [[ -f "$candidate" && ! -L "$candidate" && -s "$candidate" ]]; then
      cp "$candidate" "$REMOTE_DB_PATH"
      echo "Initialized persistent database from $candidate"
      return
    fi
  done
}

write_env_value() {
  local key="$1"
  local value="$2"
  local line="${key}=\"${value}\""
  if grep -q "^${key}=" .env; then
    sed -i "s#^${key}=.*#${line}#" .env
  else
    printf '\n%s\n' "$line" >> .env
  fi
}

ensure_runtime_database_link() {
  mkdir -p "$REMOTE_APP_DIR/prisma" "$REMOTE_APP_DIR/.next/standalone/prisma"
  ln -sfn "$REMOTE_DB_PATH" "$REMOTE_APP_DIR/prisma/dev.db"
  ln -sfn "$REMOTE_DB_PATH" "$REMOTE_APP_DIR/.next/standalone/prisma/dev.db"

  local expected
  local root_actual
  local standalone_actual
  expected="$(readlink -f "$REMOTE_DB_PATH")"
  root_actual="$(readlink -f "$REMOTE_APP_DIR/prisma/dev.db")"
  standalone_actual="$(readlink -f "$REMOTE_APP_DIR/.next/standalone/prisma/dev.db")"

  if [[ "$root_actual" != "$expected" || "$standalone_actual" != "$expected" ]]; then
    echo "Database link verification failed." >&2
    echo "Expected: $expected" >&2
    echo "Root prisma/dev.db: $root_actual" >&2
    echo "Standalone prisma/dev.db: $standalone_actual" >&2
    exit 1
  fi
}

write_systemd_helper_scripts() {
  cat > "$REMOTE_APP_DIR/migrate-workship.sh" <<SCRIPT
#!/usr/bin/env bash
set -Eeuo pipefail
cd "$REMOTE_APP_DIR"
export DATABASE_URL="file:$REMOTE_DB_PATH"
npx prisma migrate deploy
SCRIPT

  cat > "$REMOTE_APP_DIR/run-workship.sh" <<SCRIPT
#!/usr/bin/env bash
set -Eeuo pipefail
cd "$REMOTE_APP_DIR/.next/standalone"
export NODE_ENV="production"
export HOSTNAME="127.0.0.1"
export PORT="\${PORT:-$APP_PORT}"
exec node server.js
SCRIPT

  chmod +x "$REMOTE_APP_DIR/migrate-workship.sh" "$REMOTE_APP_DIR/run-workship.sh"
}

mkdir -p "$REMOTE_APP_DIR"
ensure_persistent_database
find "$REMOTE_APP_DIR" -mindepth 1 -maxdepth 1 ! -name '.env' -exec rm -rf {} +
tar -xzf "$REMOTE_RELEASE" -C "$REMOTE_APP_DIR"
cd "$REMOTE_APP_DIR"

if [[ ! -f .env ]]; then
  session_password="$(openssl rand -base64 32)"
  cat > .env <<ENV
DATABASE_URL="file:$REMOTE_DB_PATH"
SESSION_PASSWORD="$session_password"
NEXT_PUBLIC_APP_URL="$BASE_URL"
NODE_ENV="production"
ENV
else
  write_env_value "DATABASE_URL" "file:$REMOTE_DB_PATH"
  write_env_value "NEXT_PUBLIC_APP_URL" "$BASE_URL"
  write_env_value "NODE_ENV" "production"
  if ! grep -q '^SESSION_PASSWORD=' .env; then
    write_env_value "SESSION_PASSWORD" "$(openssl rand -base64 32)"
  fi
fi

npm ci
export DATABASE_URL="file:$REMOTE_DB_PATH"
ensure_runtime_database_link
npx prisma generate
npx prisma migrate deploy
npm run build

mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static
cp .env .next/standalone/.env
ensure_runtime_database_link
write_systemd_helper_scripts

run_sudo systemctl restart "$APP_SERVICE"
run_sudo systemctl --no-pager --full status "$APP_SERVICE"
REMOTE_DEPLOY

echo "Verifying endpoints and systemd services"
ssh "${SSH_ARGS[@]}" "$remote" \
  "REMOTE_APP_DIR='$REMOTE_APP_DIR' REMOTE_DB_PATH='$REMOTE_DB_PATH' BASE_URL='$BASE_URL' APP_SERVICE='$APP_SERVICE' WEB_SERVICE='$WEB_SERVICE' LICENSE_SERVICE='$LICENSE_SERVICE' bash -s" <<'REMOTE_VERIFY'
set -Eeuo pipefail

expect_ok() {
  local path="$1"
  curl -fsS --max-time 15 "$BASE_URL$path" >/dev/null
  echo "OK $path"
}

expect_status() {
  local path="$1"
  local expected="$2"
  local status
  status="$(curl -sS --max-time 15 -o /dev/null -w "%{http_code}" "$BASE_URL$path")"
  if [[ "$status" != "$expected" ]]; then
    echo "Unexpected status for $path: $status (expected $expected)" >&2
    exit 1
  fi
  echo "OK $path $status"
}

for path in /login /api/auth/init /quote-compare /purchase-board /quotes /health; do
  expect_ok "$path"
done

expect_status /api/auth/me 401
expect_status /api/data-health 401

cd "$REMOTE_APP_DIR"
npm run data:health >/dev/null
echo "OK /api/data-health"

test -s "$REMOTE_DB_PATH"
expected="$(readlink -f "$REMOTE_DB_PATH")"
for link_path in "$REMOTE_APP_DIR/prisma/dev.db" "$REMOTE_APP_DIR/.next/standalone/prisma/dev.db"; do
  test -L "$link_path"
  actual="$(readlink -f "$link_path")"
  if [[ "$actual" != "$expected" ]]; then
    echo "Database link mismatch: $link_path -> $actual, expected $expected" >&2
    exit 1
  fi
done
echo "OK runtime database links"

static_asset="$(find "$REMOTE_APP_DIR/.next/static" -type f | head -n 1 || true)"
if [[ -z "$static_asset" ]]; then
  echo "No _next/static asset found for verification." >&2
  exit 1
fi
relative_asset="${static_asset#"$REMOTE_APP_DIR/.next/static/"}"
curl -fsS --max-time 15 "$BASE_URL/_next/static/$relative_asset" >/dev/null
echo "OK _next/static"

systemctl is-active --quiet "$APP_SERVICE"
echo "OK $APP_SERVICE"
systemctl is-active --quiet "$WEB_SERVICE"
echo "OK $WEB_SERVICE"
systemctl is-active --quiet "$LICENSE_SERVICE"
echo "OK $LICENSE_SERVICE"
REMOTE_VERIFY

echo "Deployment complete."
