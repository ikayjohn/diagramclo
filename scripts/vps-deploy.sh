#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/diagramclo}"

cd "$APP_DIR"

git pull --ff-only
docker compose build
docker compose up -d postgres
docker compose run --rm backend npx prisma migrate deploy
docker compose up -d

echo "Deployment complete."
