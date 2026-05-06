# Diagramclo Launch Checklist

## Vercel Testing

Set environment variables in Vercel:

- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`
- `CORS_ORIGIN=https://your-vercel-domain.vercel.app`
- Optional email values: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `ADMIN_EMAIL`

Smoke test after each deploy:

```bash
curl https://your-vercel-domain.vercel.app/_/backend/health
```

Manual checks:

- Homepage loads.
- Shop product list loads.
- Search route `#search` works.
- Signup and login work.
- Cart add, quantity update, and checkout order creation work.
- Order tracking works with order ID and email.
- Admin login works.
- Admin analytics loads.
- Admin product, category, order, and subscriber tabs load.
- Newsletter subscribe works.

Vercel limitation:

- Product image uploads should be tested on VPS, not Vercel, because serverless filesystem persistence is not a reliable storage strategy.

## VPS First Deploy

On the server:

```bash
apt update
apt install -y docker.io docker-compose-plugin git
systemctl enable docker
systemctl start docker
mkdir -p /opt/diagramclo
cd /opt/diagramclo
git clone https://github.com/ikayjohn/diagramclo.git .
cp .env.example .env
```

Edit `.env`:

- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN=https://yourdomain.com`
- `FRONTEND_PORT=5173`
- `BACKEND_PORT=4000`
- SMTP values when ready

Deploy:

```bash
sh scripts/vps-deploy.sh
```

## VPS Reverse Proxy

Caddy:

```bash
cp deploy/caddy/Caddyfile /etc/caddy/Caddyfile
DOMAIN=yourdomain.com ACME_EMAIL=admin@yourdomain.com caddy reload --config /etc/caddy/Caddyfile
```

Nginx:

```bash
cp deploy/nginx/diagramclo.conf /etc/nginx/sites-available/diagramclo
```

Replace `example.com`, issue certificates with Certbot, then:

```bash
ln -s /etc/nginx/sites-available/diagramclo /etc/nginx/sites-enabled/diagramclo
nginx -t
systemctl reload nginx
```

## Backups

Run once:

```bash
mkdir -p /opt/backups/diagramclo
sh scripts/vps-backup.sh
```

Cron:

```cron
30 2 * * * APP_DIR=/opt/diagramclo BACKUP_DIR=/opt/backups/diagramclo sh /opt/diagramclo/scripts/vps-backup.sh >> /var/log/diagramclo-backup.log 2>&1
```

## Post-Deploy Smoke Test

- `https://yourdomain.com` loads.
- `https://yourdomain.com/_/backend/health` returns healthy response.
- Uploaded product image renders after admin upload.
- Checkout creates an order.
- Admin can update courier/tracking.
- Customer tracking page shows courier/tracking.
- Backup script creates a DB `.sql` file and uploads `.tar.gz`.

## Still Required Before Sales

- Paystack payment initialization.
- Paystack transaction verification.
- Paystack webhook.
- Mark orders `PAID` only after verified payment.
