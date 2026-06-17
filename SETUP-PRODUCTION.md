# Production Setup — Shribi Edufy

First-time deployment guide for the EduLakhya monorepo on a Linux production server.

## Architecture

| App | Port | Purpose |
|-----|------|---------|
| super-admin | 7000 | School admin, registration, settings |
| parent-portal | 7001 | Parent / student portal |
| transport-admin | 7002 | Transport staff portal |
| payroll-admin | 7003 | Fees & finance portal |
| inventory-admin | 7004 | Inventory staff portal |

Multi-tenant routing: `{slug}.yourdomain.com` → control DB lookup → tenant DB.

---

## 1. Prerequisites

- **Node.js** ≥ 18, **npm** ≥ 9
- **PostgreSQL** 14+ (accessible from the app server)
- **PM2** (recommended): `npm install -g pm2`
- Git clone of this repo on the server

```bash
cd /var/www/edufy   # or your deploy path
git pull
npm install
```

---

## 2. Environment files

Copy the template and edit with production values:

```bash
cp env.production.example apps/super-admin/.env
nano apps/super-admin/.env
```

**Required variables (super-admin):**

| Variable | Description |
|----------|-------------|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| `CONTROL_DB_*` or `CONTROL_DATABASE_URL` | Tenant registry DB (for `/register-school`) |
| `JWT_SECRET`, `NEXTAUTH_SECRET` | Min 32 chars — use random strings |
| `NEXTAUTH_URL` | e.g. `https://yourdomain.com` |
| `APP_BASE_DOMAIN` | e.g. `yourdomain.com` (no protocol) |

You can use a single URL instead of discrete fields:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/edu_crm
CONTROL_DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/Shribi Edufy_control
```

> **Important:** `CONTROL_DB_NAME` must match across all apps. Default: `Shribi Edufy_control`.

### Portal apps (7001–7004)

Each sub-app needs control DB + JWT for tenant resolution and login. Copy the same DB and JWT values into:

```bash
apps/parent-portal/.env.local
apps/transport-admin/.env.local
apps/payroll-admin/.env.local
apps/inventory-admin/.env.local
```

Minimum per portal:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password

CONTROL_DB_HOST=127.0.0.1
CONTROL_DB_PORT=5432
CONTROL_DB_NAME=Shribi Edufy_control
CONTROL_DB_USER=postgres
CONTROL_DB_PASSWORD=your-password

JWT_SECRET=same-as-super-admin
```

---

## 3. Database setup

Run the automated setup script from the repo root.

### Verify connectivity only

```bash
npm run setup:production:verify
```

### Control DB only (tenant registry)

```bash
npm run setup:production:control
```

### Full first-time setup

Creates control DB, tenant DB, runs schema + migrations, upload folders:

```bash
npm run setup:production -- \
  --tenant-db "Shribi Edufy_global" \
  --register-slug global \
  --register-name "Global Public School"
```

Or use the shell wrapper:

```bash
chmod +x scripts/setup-production.sh
./scripts/setup-production.sh \
  --tenant-db "Shribi Edufy_global" \
  --register-slug global \
  --register-name "Global Public School"
```

### Setup script options

| Flag | Description |
|------|-------------|
| `--verify` | Test DB connections only |
| `--control-only` | Control DB schema only |
| `--skip-tenant` | Skip tenant DB |
| `--skip-migrations` | Apply `schema.sql` only |
| `--skip-uploads` | Skip upload directory creation |
| `--with-inventory` | Also apply inventory tables SQL |
| `--seed-control` | Run `database/seed_control.sql` |
| `--tenant-db <name>` | Tenant database name |
| `--register-slug <slug>` | Register tenant in control DB |
| `--register-name <name>` | School display name |

### Register additional schools later

Use the web UI at `https://yourdomain.com/register-school`, or:

```bash
node scripts/setup-production.js \
  --tenant-db "Shribi Edufy_newschool" \
  --register-slug newschool \
  --register-name "New School Name"
```

---

## 4. Build

Build all apps before starting in production:

```bash
npm run build
```

Build individually if needed:

```bash
npm run build:super-admin
npm run build:parent-portal
npm run build:transport-admin
npm run build:payroll-admin
npm run build:inventory-admin
```

---

## 5. Start with PM2

An `ecosystem.config.js` is included at the repo root for all five apps.

```bash
# Create log directory
mkdir -p logs

# Start all apps
pm2 start ecosystem.config.js

# Save process list (survives reboot after pm2 startup)
pm2 save
pm2 startup   # follow the printed command once
```

### PM2 quick reference

```bash
pm2 status
pm2 logs
pm2 logs edufy-super-admin
pm2 restart all
pm2 restart edufy-super-admin
pm2 stop all
pm2 delete all
```

### Manual start (without PM2)

```bash
npm run start --workspace=super-admin      # port 7000
npm run start --workspace=parent-portal    # port 7001
npm run start --workspace=transport-admin  # port 7002
npm run start --workspace=payroll-admin    # port 7003
npm run start --workspace=inventory-admin  # port 7004
```

---

## 6. Reverse proxy (Nginx)

Example Nginx config for subdomain-based multi-tenancy. Adjust domain and SSL paths.

```nginx
# Super admin + school registration (main domain)
server {
    listen 443 ssl;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:7000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Tenant subdomains → super-admin (school admin UI)
server {
    listen 443 ssl;
    server_name *.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:7000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Parent portal (optional separate subdomain pattern)
# e.g. parents.yourdomain.com or per-tenant via path routing
server {
    listen 443 ssl;
    server_name parents.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:7001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Staff portals (transport / fees / inventory) typically run on ports 7002–7004 with similar proxy blocks, or path-based routing if preferred.

Open firewall ports only for 80/443 if Nginx terminates TLS; keep 7000–7004 bound to localhost.

---

## 7. Post-setup checklist

- [ ] `npm run setup:production:verify` passes
- [ ] `JWT_SECRET` and `NEXTAUTH_SECRET` set (not dev defaults)
- [ ] All five apps show `online` in `pm2 status`
- [ ] `https://yourdomain.com/register-school` loads without 500
- [ ] School login works: `https://<slug>.yourdomain.com/login`
- [ ] Parent portal login works on port 7001 (or proxied URL)
- [ ] Upload directory writable: `apps/super-admin/public/uploads/`
- [ ] Staff portal access configured in Settings → Staff Access

---

## 8. Troubleshooting

### `SASL: client password must be a string`

PostgreSQL password env var is missing or not a string. Set one of:

```env
CONTROL_DB_PASSWORD=your-password
DB_PASSWORD=your-password
DATABASE_URL=postgresql://user:pass@host:5432/db
```

Restart the app after changing env.

### `control_schema.sql not found`

Schema files were missing on the server. The repo `.gitignore` previously excluded all `*.sql` files from deploy.

**Fix (after pulling latest code):**

```bash
npm run db:sync-sql          # copies database/*.sql → apps/super-admin/database/
npm run build:super-admin    # prebuild also runs sync automatically
pm2 restart edufy-super-admin
```

Ensure `apps/super-admin/database/control_schema.sql` exists on the server before retrying registration.

Or run control DB setup via CLI (no API needed):

```bash
npm run setup:production:control
```

If registration fails but verify passes, ensure `CONTROL_DB_NAME` is identical in super-admin and all portal `.env` files.

### Tenant not found on subdomain

1. Check `tenants` table in control DB: `SELECT slug, db_name, is_active FROM tenants;`
2. Confirm `APP_BASE_DOMAIN` matches your Nginx `server_name` pattern.
3. Ensure tenant DB exists and migrations ran: re-run setup with `--tenant-db`.

### PM2 app crashes on start

```bash
pm2 logs edufy-super-admin --lines 50
```

Common causes: missing `.env`, build not run (`npm run build`), port already in use.

---

## 9. Updating production

```bash
git pull
npm install
npm run build
pm2 restart all
```

For schema changes only (no app deploy):

```bash
node scripts/setup-production.js --tenant-db "Your_Tenant_DB"
```

The script is idempotent — existing databases and applied migrations are skipped.
