# Host25Cent VPS Deployment Notes

These steps assume an Ubuntu VPS.

## 1. Install Docker

```bash
apt update
apt install -y docker.io docker-compose-plugin
systemctl enable docker
systemctl start docker
```

## 2. Upload The Project

Clone or copy the project into:

```bash
/opt/diagramclo
```

## 3. Configure Environment

Create `/opt/diagramclo/.env`:

```bash
POSTGRES_DB=diagramclo
POSTGRES_USER=diagramclo_user
POSTGRES_PASSWORD=replace_with_a_strong_password
DATABASE_URL=postgresql://diagramclo_user:replace_with_a_strong_password@postgres:5432/diagramclo
BACKEND_PORT=4000
JWT_SECRET=replace_with_a_long_random_secret_32_chars_minimum
CORS_ORIGIN=https://yourdomain.com
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
ADMIN_EMAIL=
```

## 4. Start Services

```bash
cd /opt/diagramclo
docker compose up -d --build
```

The backend will be available privately on:

```bash
127.0.0.1:4000
```

Expose it publicly later through Caddy or Nginx, not by opening the backend port directly.

## 5. Firewall

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

PostgreSQL stays private because `docker-compose.yml` binds it to `127.0.0.1`.

## 6. Backups

Create a backup directory:

```bash
mkdir -p /opt/backups/diagramclo
```

Manual database backup:

```bash
docker compose exec -T postgres pg_dump -U diagramclo_user diagramclo > /opt/backups/diagramclo/backup.sql
```

Automated database and upload backup:

```bash
cd /opt/diagramclo
sh scripts/vps-backup.sh
```

Daily cron at 2:30 AM:

```bash
crontab -e
```

```cron
30 2 * * * APP_DIR=/opt/diagramclo BACKUP_DIR=/opt/backups/diagramclo sh /opt/diagramclo/scripts/vps-backup.sh >> /var/log/diagramclo-backup.log 2>&1
```

Restore a database backup and optional uploads archive:

```bash
cd /opt/diagramclo
sh scripts/vps-restore.sh /opt/backups/diagramclo/db-YYYYMMDD-HHMMSS.sql /opt/backups/diagramclo/uploads-YYYYMMDD-HHMMSS.tar.gz
```
