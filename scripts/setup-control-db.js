/**
 * Create edulakhya_control database and apply control_schema.sql
 * Usage: node scripts/setup-control-db.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../apps/super-admin/.env.local') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const config = {
  host: process.env.CONTROL_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.CONTROL_DB_PORT || process.env.DB_PORT || '5432', 10),
  user: process.env.CONTROL_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.CONTROL_DB_PASSWORD || process.env.DB_PASSWORD || 'shiv',
};

const controlDbName = process.env.CONTROL_DB_NAME || 'edulakhya_control';

async function main() {
  const admin = new Pool({ ...config, database: 'postgres' });
  try {
    const exists = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [controlDbName]
    );
    if (exists.rows.length === 0) {
      console.log('Creating database:', controlDbName);
      await admin.query(`CREATE DATABASE "${controlDbName}"`);
    } else {
      console.log('Database already exists:', controlDbName);
    }
  } finally {
    await admin.end();
  }

  const schemaPath = path.join(__dirname, '../database/control_schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  const control = new Pool({ ...config, database: controlDbName });
  try {
    const tableCheck = await control.query(
      "SELECT to_regclass('public.tenants') AS reg"
    );
    if (!tableCheck.rows[0].reg) {
      console.log('Applying control schema...');
      await control.query(schemaSql);
      console.log('Control schema applied.');
    } else {
      console.log('Control schema already present.');
    }

    const orgMigrationPath = path.join(__dirname, '../database/migrations/control/001_organizations.sql');
    if (fs.existsSync(orgMigrationPath)) {
      const orgCheck = await control.query(
        "SELECT to_regclass('public.organizations') AS reg",
      );
      if (!orgCheck.rows[0].reg) {
        console.log('Applying organization migration...');
        const orgSql = fs.readFileSync(orgMigrationPath, 'utf8');
        await control.query(orgSql);
        console.log('Organization migration applied.');
      }
    }

    const phase5Path = path.join(__dirname, '../database/migrations/control/002_phase5_advanced.sql');
    if (fs.existsSync(phase5Path)) {
      const phase5Check = await control.query(
        "SELECT to_regclass('public.organization_subscriptions') AS reg",
      );
      if (!phase5Check.rows[0].reg) {
        console.log('Applying Phase 5 control migration (organization_subscriptions, etc.)...');
        const phase5Sql = fs.readFileSync(phase5Path, 'utf8');
        await control.query(phase5Sql);
        console.log('Phase 5 migration applied.');
      } else {
        console.log('Phase 5 tables already present.');
      }
    }

    const schoolCodePath = path.join(__dirname, '../database/migrations/control/003_organization_school_code.sql');
    if (fs.existsSync(schoolCodePath)) {
      const schoolCodeCheck = await control.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'school_code'`,
      );
      if (schoolCodeCheck.rows.length === 0) {
        console.log('Applying organization school_code migration...');
        const schoolCodeSql = fs.readFileSync(schoolCodePath, 'utf8');
        await control.query(schoolCodeSql);
        console.log('School code migration applied.');
      }
    }
  } finally {
    await control.end();
  }

  console.log('Control DB ready:', controlDbName);
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
