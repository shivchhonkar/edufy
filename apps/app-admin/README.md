# EduLakhya App Admin

Platform console for managing organization subscriptions across the EduLakhya control database.

## Run locally

```bash
# From monorepo root
npm install
npm run dev:app-admin
```

Open http://localhost:7006

## Environment

Copy `.env.example` to `.env` and set control DB credentials (same as `apps/super-admin`).

Required:
- `CONTROL_DB_*` or `CONTROL_DATABASE_URL`
- `JWT_SECRET`

## Create a platform admin

```bash
cd apps/app-admin
npm run seed:admin
# or with custom credentials:
node scripts/seed-platform-admin.mjs admin@example.com YourPassword "Admin Name"
```

Default seeded credentials:
- Email: `platform@edulakhya.com`
- Password: `Platform@123`

## Features

- Dashboard with platform KPIs (schools, subscriptions, revenue, health)
- Organization list with contact details and active/inactive toggle
- Per-organization subscription create/update
- Subscription registry with status filters
- **School audit** — select a school to review students, staff, classes, fee structures, and reset super admin passwords
- Platform admin auth via `platform_admins` table

## Port

Runs on **7006** by default.
