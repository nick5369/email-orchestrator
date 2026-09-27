# EmailOrchestrator — Enterprise Email Job Scheduler & Dashboard

A production-grade, restart-safe, multi-tenant email scheduling platform built with **TypeScript, Express.js, BullMQ, Redis, PostgreSQL, Prisma, Elasticsearch, React, Vite, and Tailwind CSS**.

---

## Live URLs

| Service | URL |
|---|---|
| Frontend Dashboard | https://emailorchestrator.myysite.me |
| Backend API | https://api.emailorchestrator.myysite.me |
| BullMQ Queue Dashboard | https://api.emailorchestrator.myysite.me/admin/queues |

---

## Core Design Guarantees

- **Zero Cron Jobs:** BullMQ delayed jobs backed by Redis sorted sets (ZSET). No `cron`, `node-cron`, `agenda`, or polling loops.
- **Restart Persistence:** Jobs survive process crashes. Past-due jobs run on restart; future jobs run at exact scheduled time.
- **Atomic Rate Limiting:** Per-sender hourly rate limits via atomic Redis Lua script. Over-limit jobs rescheduled, never dropped.
- **Slack OAuth Alerts:** Automated Slack notifications when rate limits are hit.
- **Elasticsearch Search:** Full-text search with automatic PostgreSQL ILIKE fallback.

---

## Architecture

```
                      Namecheap DNS
                           |
             +-------------+-------------+
             |                           |
  emailorchestrator.myysite.me   api.emailorchestrator.myysite.me
             |                           |
             +-------------+-------------+
                           |
                   AWS EC2 t2.micro
                   Ubuntu 22.04 LTS
                   +---------------+
                   |    NGINX      |  (port 80/443, free SSL)
                   +-------+-------+
                           |
              +------------+------------+
              |                         |
    Serve /dist (React)        Proxy to :5000
    emailorchestrator.          api.emailorchestrator.
       myysite.me                  myysite.me
                                       |
                              PM2 Process Manager
                          +------------+------------+
                          |                         |
                   Express API              BullMQ Worker
                   :5000                   (background)
                          |
            +-------------+-----------+
            |             |           |
        PostgreSQL      Redis     Elasticsearch
        Neon Free      Upstash    Bonsai.io
        (always free)  Free       Free Sandbox
```

---

## Local Development

### Prerequisites
- Node.js v18+ or v20 LTS
- Docker & Docker Compose

### Setup
```bash
git clone https://github.com/YOUR_USERNAME/email-orchestrator.git
cd email-orchestrator
cp .env.example .env          # edit this with your local values
npm run setup                 # installs backend + frontend deps
docker-compose up -d          # start postgres, redis, elasticsearch
cd backend
npx prisma migrate dev --name init
npx prisma db seed
cd ..
```

### Run
```bash
npm run dev:backend    # Terminal 1 — API server at :5000
npm run dev:worker     # Terminal 2 — BullMQ worker
npm run dev:frontend   # Terminal 3 — React at :3000
```

URLs:
- Frontend: http://localhost:3000
- API: http://localhost:5000
- BullMQ Board: http://localhost:5000/admin/queues

---

## AWS Free Tier Deployment — Complete Guide

### What You Need Before Starting
- AWS account (free tier)
- GitHub account
- Namecheap domain: `emailorchestrator.myysite.me` (from GitHub Student Pack)
- Upstash account (upstash.com)
- Bonsai.io account (bonsai.io)

### Final Cost: $0/month for 12 months

| Service | Plan | Cost |
|---|---|---|
| EC2 t2.micro | Free tier (750 hrs/month) | Free |
| Neon PostgreSQL | Free forever (0.5 GB, no credit card) | Free |
| Upstash Redis | Free (10,000 cmds/day) | Free |
| Bonsai.io Elasticsearch | Free sandbox (125MB) | Free |
| Let's Encrypt SSL | Always free | Free |

---

### PHASE 1 — Push to GitHub

```bash
# In your project root folder:
git init
git add .
git commit -m "feat: initial EmailOrchestrator commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/email-orchestrator.git
git push -u origin main
```

---

### PHASE 2 — Create Free External Services

#### 2A — Upstash Redis

1. Go to https://console.upstash.com → Sign Up
2. Click **Create Database**
3. Name: `email-orchestrator-redis` | Region: `us-east-1` | Type: Regional
4. Click **Create**
5. In **Details** tab, copy the **REDIS_URL** (starts with `rediss://`)

```
rediss://default:ABCDEFG@your-host.upstash.io:6379
```

#### 2B — Bonsai.io Elasticsearch

1. Go to https://bonsai.io → Sign Up (no credit card)
2. Click **Create Cluster** → Plan: **Sandbox** (free)
3. Name: `email-orchestrator-es`
4. Wait ~2 minutes → Go to **Credentials** tab
5. Copy the full URL:

```
https://USERNAME:PASSWORD@abc123.bonsaisearch.net:443
```

#### 2C — Neon PostgreSQL (Free, No Credit Card)

1. Go to https://neon.tech → Sign Up with GitHub (free forever)
2. Click **New Project**
3. Project name: `email-orchestrator`
4. PostgreSQL version: **16** (latest)
5. Region: **AWS us-east-1** (closest to EC2)
6. Click **Create Project**
7. You will immediately see a connection string — click **Copy snippet**

The URL looks like:

```
postgresql://username:password@ep-XXXX.us-east-2.aws.neon.tech/neondb?sslmode=require
```

**Important:** Neon uses a different database name by default (`neondb`). You can either:
- Use it as-is (`neondb`) — works fine
- Or go to **Databases** tab → **New Database** → name it `email_orchestrator`

The final `DATABASE_URL` will look like:
```
postgresql://username:password@ep-XXXX.us-east-2.aws.neon.tech/email_orchestrator?sslmode=require
```

> No security group or firewall config needed — Neon allows connections from anywhere by default.

---

### PHASE 3 — Launch AWS EC2 Instance

#### 3A — Create the Instance

1. AWS Console → **EC2** → **Launch Instance**
2. Name: `email-orchestrator-server`
3. AMI: **Ubuntu Server 22.04 LTS** (Free Tier eligible)
4. Instance type: **t2.micro** (Free Tier)
5. Key pair: **Create new key pair**
   - Name: `email-orchestrator-key`
   - Type: RSA | Format: `.pem`
   - Click Create → `.pem` file downloads to your PC
6. Network settings → **Edit**:
   - Auto-assign public IP: **Enable**
   - Create security group: `email-orchestrator-sg`
   - Add inbound rules:

| Type | Port | Source | Why |
|---|---|---|---|
| SSH | 22 | My IP | For you to SSH in |
| HTTP | 80 | 0.0.0.0/0 | HTTP traffic |
| HTTPS | 443 | 0.0.0.0/0 | HTTPS traffic |

7. Storage: `8 GB gp2`
8. Click **Launch Instance**

#### 3B — Allocate a Static (Elastic) IP

> Regular EC2 IPs change on every restart. Elastic IP is permanent and free while attached.

1. EC2 Console → left sidebar → **Elastic IPs**
2. Click **Allocate Elastic IP address** → **Allocate**
3. Select the new IP → **Actions** → **Associate Elastic IP address**
4. Instance: select `email-orchestrator-server`
5. Click **Associate**
6. Save this IP (e.g. `3.84.XXX.XXX`) — you will use it in DNS

#### 3C — Connect to EC2 via SSH

```powershell
# Windows PowerShell — fix key file permissions first
icacls "C:\Users\admin\Downloads\email-orchestrator-key.pem" /inheritance:r /grant:r "%username%:R"

# Connect (replace with your Elastic IP)
ssh -i "C:\Users\admin\Downloads\email-orchestrator-key.pem" ubuntu@3.84.XXX.XXX
```

---

### PHASE 4 — Configure DNS in Namecheap

1. Go to https://www.namecheap.com → Login → **Domain List**
2. Click **Manage** next to `myysite.me`
3. Click **Advanced DNS** tab
4. Delete any existing A/CNAME records for `emailorchestrator` if present
5. Add these 2 records:

| Type | Host | Value | TTL |
|---|---|---|---|
| A Record | `emailorchestrator` | `YOUR_EC2_ELASTIC_IP` | Automatic |
| A Record | `api.emailorchestrator` | `YOUR_EC2_ELASTIC_IP` | Automatic |

> Both subdomains point to the same EC2 IP. Nginx on EC2 will route them differently.

6. Click the checkmark to save each record.
7. Wait 5–30 minutes for DNS to propagate.

**Test DNS propagation:**
```bash
# Run from your Windows PC (after ~15 minutes)
nslookup emailorchestrator.myysite.me
nslookup api.emailorchestrator.myysite.me
# Both should return your EC2 Elastic IP
```

---

### PHASE 5 — Server Setup on EC2

SSH into your EC2 and run all these commands:

#### 5A — Install Required Software

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version    # v20.x.x
npm --version     # 10.x.x

# Install PM2 — keeps Node processes alive
sudo npm install -g pm2

# Install Nginx — web server + reverse proxy
sudo apt install -y nginx

# Install Certbot — free SSL via Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx

# Install Git
sudo apt install -y git

# Verify Nginx is running
sudo systemctl status nginx    # should show "active (running)"
```

#### 5B — Clone Your Repository

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/email-orchestrator.git
cd email-orchestrator

# Install all dependencies
npm run setup
```

#### 5C — Configure Backend Environment Variables

```bash
nano backend/.env
```

Paste the following, replacing all placeholder values:

```bash
# ============================================================
# EmailOrchestrator — Backend Production Environment
# ============================================================

NODE_ENV=production
PORT=5000
CLIENT_URL=https://emailorchestrator.myysite.me

# --- PostgreSQL (Neon) ---
# Copy from Neon dashboard → your project → Connection string
DATABASE_URL="postgresql://username:password@ep-XXXX.us-east-2.aws.neon.tech/email_orchestrator?sslmode=require"

# --- Redis (Upstash) ---
REDIS_URL=rediss://default:YOUR_UPSTASH_PASSWORD@YOUR_HOST.upstash.io:6379

# --- Elasticsearch (Bonsai.io) ---
ELASTICSEARCH_NODE=https://USERNAME:PASSWORD@YOURCLUSTER.bonsaisearch.net:443
ELASTICSEARCH_URL=https://USERNAME:PASSWORD@YOURCLUSTER.bonsaisearch.net:443

# --- Security Secrets ---
# Generate JWT_SECRET:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=PASTE_64_CHAR_HEX_HERE

# ENCRYPTION_SECRET must be EXACTLY 32 characters
# Generate: node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"  (gives 32 hex chars)
ENCRYPTION_SECRET=PASTE_EXACTLY_32_CHARS_HERE

# --- Google OAuth ---
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL=https://api.emailorchestrator.myysite.me/api/auth/google/callback

# --- Slack OAuth ---
SLACK_CLIENT_ID=YOUR_SLACK_CLIENT_ID
SLACK_CLIENT_SECRET=YOUR_SLACK_CLIENT_SECRET
SLACK_REDIRECT_URI=https://api.emailorchestrator.myysite.me/api/slack/callback

# --- Worker ---
WORKER_CONCURRENCY=10
DEFAULT_MIN_DELAY_MS=2000
DEFAULT_HOURLY_LIMIT=100
```

Save: `Ctrl+X` → `Y` → `Enter`

**Quick way to generate secrets:**
```bash
# JWT_SECRET (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_SECRET (exactly 32 hex chars)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

#### 5D — Build Backend + Run Database Migrations

```bash
cd ~/email-orchestrator/backend

# Build TypeScript to JavaScript
npm run build

# Apply DB schema to Neon (runs migrations remotely)
npx prisma migrate deploy

# Seed initial data
npx prisma db seed

cd ..
```

#### 5E — Build Frontend for Production

```bash
cd ~/email-orchestrator/frontend

# Create the production env file
cat > .env.production << 'EOF'
VITE_API_BASE_URL=https://api.emailorchestrator.myysite.me/api
EOF

# Build React app (output goes to frontend/dist/)
npm run build

cd ..
```

#### 5F — Start Backend with PM2

```bash
cd ~/email-orchestrator

# Start API server
pm2 start backend/dist/server.js --name "email-orchestrator-api"

# Start BullMQ worker
pm2 start backend/dist/worker.js --name "email-orchestrator-worker"

# Save process list (survives reboots)
pm2 save

# Enable PM2 to auto-start on EC2 reboot
pm2 startup
# IMPORTANT: Copy and run the command that pm2 startup outputs!
# It looks like: sudo env PATH=$PATH:/usr/bin pm2 startup ...

# Check all processes are running
pm2 status
```

Expected output:
```
┌─────────────────────────────┬─────┬───────┬─────────┐
│ name                        │ id  │ status│ cpu/mem │
├─────────────────────────────┼─────┼───────┼─────────┤
│ email-orchestrator-api      │ 0   │ online│         │
│ email-orchestrator-worker   │ 1   │ online│         │
└─────────────────────────────┴─────┴───────┴─────────┘
```

---

### PHASE 6 — Configure Nginx

Nginx will:
- Serve your React app at `emailorchestrator.myysite.me`
- Forward API requests to Express at `api.emailorchestrator.myysite.me`

```bash
sudo nano /etc/nginx/sites-available/email-orchestrator
```

Paste this **entire config**:

```nginx
# ─────────────────────────────────────────────
# Frontend — Serve React build
# emailorchestrator.myysite.me
# ─────────────────────────────────────────────
server {
    listen 80;
    server_name emailorchestrator.myysite.me;

    root /home/ubuntu/email-orchestrator/frontend/dist;
    index index.html;

    # React Router — serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}

# ─────────────────────────────────────────────
# Backend API — Proxy to Express on port 5000
# api.emailorchestrator.myysite.me
# ─────────────────────────────────────────────
server {
    listen 80;
    server_name api.emailorchestrator.myysite.me;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
    }
}
```

Save: `Ctrl+X` → `Y` → `Enter`

```bash
# Enable the config
sudo ln -s /etc/nginx/sites-available/email-orchestrator /etc/nginx/sites-enabled/

# Disable default Nginx page
sudo rm /etc/nginx/sites-enabled/default

# Test the config (must say "syntax is ok")
sudo nginx -t

# Apply the config
sudo systemctl reload nginx
```

---

### PHASE 7 — Enable Free HTTPS with Let's Encrypt

> **Wait for DNS to propagate before this step!**
> Test: `nslookup emailorchestrator.myysite.me` must return your EC2 IP.

```bash
# Get SSL for BOTH domains in one command
sudo certbot --nginx \
  -d emailorchestrator.myysite.me \
  -d api.emailorchestrator.myysite.me

# Follow prompts:
# → Enter your email (for renewal reminders)
# → (A)gree to terms
# → (N)o to EFF email sharing
```

Certbot automatically:
- Gets free SSL certificates from Let's Encrypt
- Updates your Nginx config to use HTTPS (port 443)
- Sets up HTTP → HTTPS redirects

**Test auto-renewal (certificates renew every 90 days):**
```bash
sudo certbot renew --dry-run
```

---

### PHASE 8 — Update OAuth Credentials

Since your URLs changed, update the OAuth apps:

#### Google OAuth
1. Go to https://console.cloud.google.com → **APIs & Services** → **Credentials**
2. Click your OAuth 2.0 Client ID
3. **Authorized JavaScript origins:** Add `https://emailorchestrator.myysite.me`
4. **Authorized redirect URIs:** Add `https://api.emailorchestrator.myysite.me/api/auth/google/callback`
5. Click **Save**

#### Slack OAuth
1. Go to https://api.slack.com/apps → select your app
2. **OAuth & Permissions** → **Redirect URLs**
3. Add `https://api.emailorchestrator.myysite.me/api/slack/callback`
4. Click **Save URLs**

---

### PHASE 9 — Verify Everything Works

```bash
# 1. Check API health
curl https://api.emailorchestrator.myysite.me/api/health
# Expected: {"status":"ok"}

# 2. Check PM2 processes
pm2 status

# 3. Check Nginx
sudo systemctl status nginx

# 4. Check SSL certificates
sudo certbot certificates

# 5. Check logs for errors
pm2 logs email-orchestrator-api --lines 30
pm2 logs email-orchestrator-worker --lines 30
```

Open https://emailorchestrator.myysite.me in your browser ✅

---

## Redeploy After Code Changes

```bash
# On EC2 — after pushing new code to GitHub:
cd ~/email-orchestrator
git pull origin main

# Rebuild backend
cd backend && npm install && npm run build
cd ..

# Rebuild frontend (if frontend changed)
cd frontend && npm run build
cd ..

# Restart backend services
pm2 restart email-orchestrator-api
pm2 restart email-orchestrator-worker
# Nginx auto-serves the new frontend build — no Nginx restart needed!
```

---

## Feature Mapping Matrix

| Feature | Backend | Frontend |
|---|---|---|
| No-Cron BullMQ Queue | `src/queue/emailQueue.ts` | — |
| Worker Concurrency | `src/queue/worker.ts` | — |
| Atomic Redis Rate Limiter | `src/services/rateLimiterService.ts` | — |
| Slack OAuth & Alerts | `src/services/slackService.ts` | `pages/SettingsPage.tsx` |
| Elasticsearch + Fallback | `src/services/elasticsearchService.ts` | `components/dashboard/SearchBar.tsx` |
| Google OAuth + JWT | `src/services/authService.ts` | `pages/LoginPage.tsx` |
| CSV Lead Parser | — | `hooks/useCsvParser.ts` |
| Live Queue Dashboard | `src/app.ts` (/admin/queues) | `components/layout/Header.tsx` |
