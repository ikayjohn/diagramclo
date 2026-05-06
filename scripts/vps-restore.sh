#!/usr/bin/env sh
set -eu

if [ "$#" -lt 1 ]; then
  echo "Usage: scripts/vps-restore.sh /opt/backups/diagramclo/db-YYYYMMDD-HHMMSS.sql [uploads.tar.gz]"
  exit 1
fi

APP_DIR="${APP_DIR:-/opt/diagramclo}"
DB_BACKUP="$1"
UPLOADS_BACKUP="${2:-}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$APP_DIR")}"
UPLOAD_VOLUME="${COMPOSE_PROJECT_NAME}_backend_uploads"

cd "$APP_DIR"

POSTGRES_USER="$(grep '^POSTGRES_USER=' .env | cut -d= -f2-)"
POSTGRES_DB="$(grep '^POSTGRES_DB=' .env | cut -d= -f2-)"

docker compose exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB" < "$DB_BACKUP"

if [ -n "$UPLOADS_BACKUP" ]; then
  docker run --rm \
    -v "$UPLOAD_VOLUME":/uploads \
    -v "$(dirname "$UPLOADS_BACKUP")":/backup \
    alpine sh -c "cd /uploads && tar -xzf /backup/$(basename "$UPLOADS_BACKUP")"
fi

echo "Restore complete."
