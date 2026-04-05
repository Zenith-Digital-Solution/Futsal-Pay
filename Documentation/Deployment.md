# Deployment Guide

This guide covers deploying FutsalApp (FastAPI backend + Next.js frontend) to a production server using Docker Compose, with a GitHub Actions CI/CD pipeline.

## Architecture Overview

```
Internet → Nginx (reverse proxy)
              ├── :80/:443 → Next.js (port 3000)
              └── /api/*   → FastAPI  (port 8000)
                               ├── PostgreSQL (port 5432)
                               ├── Redis      (port 6379)
                               ├── Celery Worker
                               └── Celery Beat
```

---

## 1. Server Setup (Ubuntu/Debian)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# Install Docker Compose plugin
sudo apt-get install docker-compose-plugin -y
docker compose version

# Install Nginx (for SSL termination)
sudo apt-get install nginx certbot python3-certbot-nginx -y
```

---

## 2. Repository Secrets (GitHub Actions)

Navigate to **Settings → Secrets and variables → Actions** and add:

| Secret | Description |
|--------|-------------|
| `DO_HOST` | Server IP address |
| `DO_USERNAME` | SSH username (e.g., `deploy`) |
| `DO_SSH_PRIVATE_KEY` | Private SSH key for server access |
| `DEPLOY_ENV` | Full contents of `publish/.env` used by the canonical deployment compose file |

---

## 3. Docker Compose (`publish/docker-compose.yaml`)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always

  backend:
    build: ../backend
    restart: always
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    command: uvicorn src.main:app --host 0.0.0.0 --port 8000

  celery:
    build: ../backend
    restart: always
    depends_on:
      - redis
      - postgres
    command: celery -A src.apps.core.celery_app worker --loglevel=info --concurrency=4

  celery-beat:
    build: ../backend
    restart: always
    depends_on:
      - redis
      - postgres
    command: celery -A src.apps.core.celery_app beat --loglevel=info

  frontend:
    build: ../frontend
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## 4. CI/CD Workflow

The workflow at `.github/workflows/ci-cd.yaml` runs on every push to `main`:

1. **Build & lint** — type check, import verification
2. **SSH deploy** — copy new files to server
3. **Migrate** — `docker compose -f publish/docker-compose.yaml --env-file publish/.env exec backend alembic upgrade head`
4. **Restart** — `docker compose -f publish/docker-compose.yaml --env-file publish/.env up -d --build`

### Sample Workflow

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Write env files
        run: |
          cp publish/.env.example publish/.env
          echo "${{ secrets.DEPLOY_ENV }}" > publish/.env

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DO_HOST }}
          username: ${{ secrets.DO_USERNAME }}
          key: ${{ secrets.DO_SSH_PRIVATE_KEY }}
          script: |
            cd ~/futsalapp
            git pull origin main
            docker compose -f publish/docker-compose.yaml --env-file publish/.env up -d --build
            docker compose -f publish/docker-compose.yaml --env-file publish/.env exec backend alembic upgrade head
```

---

## 5. Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Next.js frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # FastAPI backend
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /api/v1/ws/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Obtain SSL certificate:
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 6. Production Environment Variables

Key variables to set in `.env` for production:

```env
DEBUG=False
SECRET_KEY=<random 64-char string>
DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/futsalapp
REDIS_URL=redis://redis:6379/0
ALLOWED_HOSTS=yourdomain.com,api.yourdomain.com

# Payout
PAYOUT_MODE=PLATFORM
PLATFORM_KHALTI_SECRET_KEY=<live key>

# Analytics
POSTHOG_ENABLED=true
POSTHOG_API_KEY=phc_xxxx

# Email
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=<sendgrid api key>
```

---

## 7. Manual Deployment

```bash
# On the server
git clone https://github.com/your-username/Futsal.git ~/futsalapp
cd ~/futsalapp
cp publish/.env.example publish/.env && nano publish/.env
docker compose -f publish/docker-compose.yaml --env-file publish/.env up -d --build
docker compose -f publish/docker-compose.yaml --env-file publish/.env exec backend alembic upgrade head
```

---

## 8. Monitoring & Troubleshooting

```bash
# View all service logs
docker compose -f publish/docker-compose.yaml --env-file publish/.env logs -f

# View specific service
docker compose -f publish/docker-compose.yaml --env-file publish/.env logs -f backend
docker compose -f publish/docker-compose.yaml --env-file publish/.env logs -f celery

# Restart a single service
docker compose -f publish/docker-compose.yaml --env-file publish/.env restart backend

# Check running containers
docker compose -f publish/docker-compose.yaml --env-file publish/.env ps

# Shell into the API container
docker compose -f publish/docker-compose.yaml --env-file publish/.env exec backend bash
```

**Common issues:**

| Problem | Fix |
|---------|-----|
| `alembic upgrade head` fails | Check `DATABASE_URL` in `publish/.env`; ensure `postgres` is healthy |
| Celery tasks not running | Verify `REDIS_URL`; check `celery-beat` container logs |
| 502 Bad Gateway | Nginx config pointing to wrong port; check the publish compose service ports |
| `subscription_required` errors | Owner needs active subscription; check `owner_subscriptions` table |
| Payout job not running | Check `celery-beat` logs at 00:00 UTC; verify `PAYOUT_MODE` |
