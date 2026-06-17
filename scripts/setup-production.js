#!/usr/bin/env node
/**
 * First-time production setup for Shribi Edufy (EduLakhya monorepo)
 *
 * Creates control DB, optional tenant DB, runs schema + migrations,
 * creates upload folders, and verifies connectivity.
 *
 * Usage:
 *   node scripts/setup-production.js
 *   node scripts/setup-production.js --verify
 *   node scripts/setup-production.js --control-only
 *   node scripts/setup-production.js --tenant-db "Shribi Edufy_global" --register-slug global --register-name "Global Public School"
 *   node scripts/setup-production.js --with-inventory
 *
 * Env (apps/super-admin/.env or root .env):
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD  (or DATABASE_URL)
 *   CONTROL_DB_NAME, CONTROL_DB_PASSWORD    (control / tenant registry)
 */

const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const ROOT = path.resolve(__dirname, '..')
const { getControlDbConfig, getTenantDbConfig, validateConfig } = require('./lib/db-config')
const {
  TENANT_MIGRATION_FILES,
  OPTIONAL_SQL_FILES,
  ensureMigrationTable,
  applySqlFile,
} = require('./lib/migrations')

function loadEnvFiles() {
  const candidates = [
    path.join(ROOT, '.env'),
    path.join(ROOT, '.env.local'),
    path.join(ROOT, '.env.production'),
    path.join(ROOT, 'apps/super-admin/.env'),
    path.join(ROOT, 'apps/super-admin/.env.local'),
    path.join(ROOT, 'apps/super-admin/.env.production'),
  ]

  require('dotenv').config()
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      require('dotenv').config({ path: file, override: true })
    }
  }
}

function parseArgs(argv) {
  const args = {
    verify: false,
    controlOnly: false,
    skipTenant: false,
    skipMigrations: false,
    skipUploads: false,
    withInventory: false,
    seedControl: false,
    tenantDb: process.env.DB_NAME || null,
    registerSlug: null,
    registerName: null,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--verify') args.verify = true
    else if (arg === '--control-only') args.controlOnly = true
    else if (arg === '--skip-tenant') args.skipTenant = true
    else if (arg === '--skip-migrations') args.skipMigrations = true
    else if (arg === '--skip-uploads') args.skipUploads = true
    else if (arg === '--with-inventory') args.withInventory = true
    else if (arg === '--seed-control') args.seedControl = true
    else if (arg.startsWith('--tenant-db=')) args.tenantDb = arg.split('=')[1]
    else if (arg === '--tenant-db') args.tenantDb = argv[++i]
    else if (arg.startsWith('--register-slug=')) args.registerSlug = arg.split('=')[1]
    else if (arg === '--register-slug') args.registerSlug = argv[++i]
    else if (arg.startsWith('--register-name=')) args.registerName = arg.split('=')[1]
    else if (arg === '--register-name') args.registerName = argv[++i]
    else if (arg === '--help' || arg === '-h') args.help = true
  }

  return args
}

function printHelp() {
  console.log(`
Shribi Edufy — production setup

  node scripts/setup-production.js [options]

Options:
  --verify              Test DB connectivity only
  --control-only        Setup control DB only (tenant registry)
  --skip-tenant         Skip tenant DB schema/migrations
  --skip-migrations     Apply schema.sql only (no migration files)
  --skip-uploads        Skip creating upload directories
  --with-inventory      Also apply inventory tables SQL
  --seed-control        Insert demo tenant row from seed_control.sql
  --tenant-db <name>    Tenant database name (default: DB_NAME)
  --register-slug <s>   Register tenant slug in control DB
  --register-name <n>   Register tenant display name
  -h, --help            Show this help

Environment (set in apps/super-admin/.env or root .env):
  DATABASE_URL or DB_HOST / DB_USER / DB_PASSWORD
  CONTROL_DB_NAME (default: Shribi Edufy_control)
  CONTROL_DB_PASSWORD or same as DB_PASSWORD
  APP_BASE_DOMAIN (e.g. yourdomain.com:7000)
`)
}

async function testConnection(config, label) {
  const pool = new Pool(config)
  try {
    const result = await pool.query('SELECT current_database() AS db, NOW() AS now')
    console.log(`  ✓ ${label}: connected to "${result.rows[0].db}"`)
    return true
  } finally {
    await pool.end()
  }
}

async function ensureDatabase(adminConfig, dbName) {
  const pool = new Pool({ ...adminConfig, database: 'postgres' })
  try {
    const exists = await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
    if (exists.rows.length === 0) {
      console.log(`  → Creating database: ${dbName}`)
      await pool.query(`CREATE DATABASE "${dbName}"`)
    } else {
      console.log(`  ✓ Database exists: ${dbName}`)
    }
  } finally {
    await pool.end()
  }
}

async function setupControlDatabase() {
  console.log('\n[1/5] Control database (tenant registry)')
  const controlDbName = getControlDbConfig().database
  const adminConfig = getControlDbConfig('postgres')
  validateConfig(adminConfig, 'Control DB')

  await ensureDatabase(adminConfig, controlDbName)

  const schemaPath = path.join(ROOT, 'database', 'control_schema.sql')
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Missing file: ${schemaPath}`)
  }

  const pool = new Pool(getControlDbConfig(controlDbName))
  try {
    const tableCheck = await pool.query("SELECT to_regclass('public.tenants') AS reg")
    if (!tableCheck.rows[0]?.reg) {
      console.log('  → Applying control_schema.sql')
      const sql = fs.readFileSync(schemaPath, 'utf8')
      await pool.query(sql)
      console.log('  ✓ Control schema applied')
    } else {
      console.log('  ✓ Control schema already present')
    }
  } finally {
    await pool.end()
  }

  return controlDbName
}

async function registerTenant(controlDbName, slug, name, tenantDbName) {
  if (!slug || !name || !tenantDbName) return

  console.log(`\n  → Registering tenant: ${slug} → ${tenantDbName}`)
  const pool = new Pool(getControlDbConfig(controlDbName))
  try {
    const existing = await pool.query('SELECT id FROM tenants WHERE slug = $1', [slug])
    if (existing.rows.length) {
      console.log(`  ✓ Tenant "${slug}" already registered`)
      return
    }

    const inserted = await pool.query(
      `INSERT INTO tenants (slug, name, db_name, is_active)
       VALUES ($1, $2, $3, true) RETURNING id`,
      [slug, name, tenantDbName],
    )
    const tenantId = inserted.rows[0].id
    await pool.query(
      `INSERT INTO tenant_branding (tenant_id, subdomain, primary_color, secondary_color)
       VALUES ($1, $2, '#2563eb', '#1e40af')
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId, slug],
    )
    console.log(`  ✓ Tenant registered (id=${tenantId})`)
  } finally {
    await pool.end()
  }
}

async function seedControlDatabase(controlDbName) {
  const seedPath = path.join(ROOT, 'database', 'seed_control.sql')
  if (!fs.existsSync(seedPath)) {
    console.log('  ⏭  seed_control.sql not found')
    return
  }

  console.log('\n  → Running seed_control.sql')
  const pool = new Pool(getControlDbConfig(controlDbName))
  try {
    await pool.query(fs.readFileSync(seedPath, 'utf8'))
    console.log('  ✓ Control seed applied')
  } finally {
    await pool.end()
  }
}

async function setupTenantDatabase(dbName, options) {
  console.log(`\n[2/5] Tenant database: ${dbName}`)
  const adminConfig = getTenantDbConfig('postgres')
  validateConfig(adminConfig, 'Tenant DB')

  await ensureDatabase(adminConfig, dbName)

  const schemaPath = path.join(ROOT, 'database', 'schema.sql')
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Missing file: ${schemaPath}`)
  }

  const pool = new Pool(getTenantDbConfig(dbName))
  const client = await pool.connect()
  try {
    const usersTable = await client.query("SELECT to_regclass('public.users') AS reg")
    if (!usersTable.rows[0]?.reg) {
      console.log('  → Applying schema.sql')
      await client.query(fs.readFileSync(schemaPath, 'utf8'))
      console.log('  ✓ Base schema applied')
    } else {
      console.log('  ✓ Base schema already present')
    }

    if (!options.skipMigrations) {
      console.log('  → Applying migrations')
      await ensureMigrationTable(client)
      const migrationsDir = path.join(ROOT, 'database', 'migrations')

      for (const file of TENANT_MIGRATION_FILES) {
        await applySqlFile(client, path.join(migrationsDir, file), file)
      }

      if (options.withInventory) {
        for (const file of OPTIONAL_SQL_FILES) {
          await applySqlFile(client, path.join(ROOT, 'database', file), file, {
            skipIfApplied: false,
          })
        }
      }
    }
  } finally {
    client.release()
    await pool.end()
  }
}

function setupUploadDirectories() {
  console.log('\n[3/5] Upload directories')
  const dirs = [
    path.join(ROOT, 'apps/super-admin/public/uploads'),
    path.join(ROOT, 'apps/super-admin/public/uploads/homework'),
    path.join(ROOT, 'apps/super-admin/public/uploads/documents'),
    path.join(ROOT, 'apps/super-admin/public/uploads/logos'),
    path.join(ROOT, 'apps/super-admin/public/uploads/students'),
    path.join(ROOT, 'apps/super-admin/public/uploads/staff'),
  ]

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      console.log(`  ✓ Created ${path.relative(ROOT, dir)}`)
    } else {
      console.log(`  ✓ Exists ${path.relative(ROOT, dir)}`)
    }
    const gitkeep = path.join(dir, '.gitkeep')
    if (!fs.existsSync(gitkeep)) {
      fs.writeFileSync(gitkeep, '')
    }
  }
}

function printNextSteps(args, controlDbName, tenantDbName) {
  const baseDomain = process.env.APP_BASE_DOMAIN || process.env.NEXT_PUBLIC_APP_BASE_DOMAIN || 'localhost:7000'

  console.log('\n[5/5] Next steps')
  console.log('────────────────────────────────────────')
  console.log('1. Install dependencies (if not done):')
  console.log('     npm install')
  console.log('')
  console.log('2. Build all apps:')
  console.log('     npm run build')
  console.log('')
  console.log('3. Start services (example with PM2):')
  console.log('     pm2 start npm --name edufy-super-admin -- run start --workspace=super-admin')
  console.log('     pm2 start npm --name edufy-parent-portal -- run start --workspace=parent-portal')
  console.log('')
  console.log('4. Register a new school (web UI):')
  console.log(`     https://your-domain/register-school`)
  console.log('')
  if (!args.registerSlug) {
    console.log('   Or register existing tenant DB:')
    console.log(
      `     node scripts/setup-production.js --register-slug global --register-name "Your School" --tenant-db "${tenantDbName}"`,
    )
    console.log('')
  }
  console.log('5. School login URL pattern:')
  console.log(`     http://<slug>.${baseDomain}/login`)
  console.log('')
  console.log('Control DB:', controlDbName)
  if (tenantDbName) console.log('Tenant DB: ', tenantDbName)
  console.log('────────────────────────────────────────')
}

async function main() {
  loadEnvFiles()
  const args = parseArgs(process.argv.slice(2))

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  console.log('Shribi Edufy — production setup')
  console.log('Root:', ROOT)

  const adminConfig = getControlDbConfig('postgres')
  validateConfig(adminConfig, 'PostgreSQL')

  console.log('\n[0/5] Connectivity check')
  await testConnection(adminConfig, 'PostgreSQL admin')

  if (args.verify) {
    const controlDbName = getControlDbConfig().database
    try {
      await testConnection(getControlDbConfig(controlDbName), 'Control DB')
    } catch {
      console.log(`  ⚠ Control DB "${controlDbName}" not ready yet — run without --verify`)
    }
    if (args.tenantDb) {
      try {
        await testConnection(getTenantDbConfig(args.tenantDb), 'Tenant DB')
      } catch {
        console.log(`  ⚠ Tenant DB "${args.tenantDb}" not ready yet`)
      }
    }
    console.log('\n✅ Verification complete')
    return
  }

  const controlDbName = await setupControlDatabase()

  if (args.seedControl) {
    await seedControlDatabase(controlDbName)
  }

  let tenantDbName = null
  if (!args.controlOnly && !args.skipTenant && args.tenantDb) {
    tenantDbName = args.tenantDb
    await setupTenantDatabase(tenantDbName, args)
  }

  if (args.registerSlug && args.registerName && tenantDbName) {
    await registerTenant(controlDbName, args.registerSlug, args.registerName, tenantDbName)
  }

  if (!args.skipUploads) {
    setupUploadDirectories()
  } else {
    console.log('\n[3/5] Upload directories skipped')
  }

  console.log('\n[4/5] Environment checklist')
  const required = ['JWT_SECRET', 'NEXTAUTH_SECRET']
  for (const key of required) {
    if (process.env[key]) {
      console.log(`  ✓ ${key} is set`)
    } else {
      console.log(`  ⚠ ${key} is missing — set before production use`)
    }
  }
  if (process.env.APP_BASE_DOMAIN || process.env.NEXT_PUBLIC_APP_BASE_DOMAIN) {
    console.log(`  ✓ APP_BASE_DOMAIN: ${process.env.APP_BASE_DOMAIN || process.env.NEXT_PUBLIC_APP_BASE_DOMAIN}`)
  } else {
    console.log('  ⚠ APP_BASE_DOMAIN not set — school URLs will use localhost')
  }

  printNextSteps(args, controlDbName, tenantDbName)
  console.log('\n✅ Production setup complete')
}

main().catch((err) => {
  console.error('\n❌ Setup failed:', err.message)
  process.exit(1)
})
