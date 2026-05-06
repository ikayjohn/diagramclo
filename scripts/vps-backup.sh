#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/diagramclo}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/diagramclo}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$APP_DIR")}"
UPLOAD_VOLUME="${COMPOSE_PROJECT_NAME}_backend_uploads"

cd "$APP_DIR"
mkdir -p "$BACKUP_DIR"

POSTGRES_USER="$(grep '^POSTGRES_USER=' .env | cut -d= -f2-)"
POSTGRES_DB="$(grep '^POSTGRES_DB=' .env | cut -d= -f2-)"

docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_DIR/db-$STAMP.sql"

if docker volume inspect "$UPLOAD_VOLUME" >/dev/null 2>&1; then
  docker run --rm \
    -v "$UPLOAD_VOLUME":/uploads:ro \
    -v "$BACKUP_DIR":/backup \
    alpine sh -c "cd /uploads && tar -czf /backup/uploads-$STAMP.tar.gz ."
fi

find "$BACKUP_DIR" -type f \( -name 'db-*.sql' -o -name 'uploads-*.tar.gz' \) -mtime +"$RETENTION_DAYS" -delete

echo "Backup complete: $BACKUP_DIR"
