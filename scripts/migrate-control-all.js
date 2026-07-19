/**
 * Apply all control DB migrations required by app-admin (organizations, phase 5, school code).
 * Usage: node scripts/migrate-control-all.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../apps/app-admin/.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../apps/super-admin/.env.local') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const config = {
  host: process.env.CONTROL_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.CONTROL_DB_PORT || process.env.DB_PORT || '5432', 10),
  user: process.env.CONTROL_DB_USER || process.env.DB_USER || 'postgres',
  password: process.env.CONTROL_DB_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.CONTROL_DB_NAME || 'Shribi Edufy_control',
};

const migrations = [
  '001_organizations.sql',
  '002_phase5_advanced.sql',
  '003_organization_school_code.sql',
];

async function tableExists(pool, tableName) {
  const result = await pool.query('SELECT to_regclass($1) AS reg', [`public.${tableName}`]);
  return !!result.rows[0]?.reg;
}

async function main() {
  const pool = new Pool(config);
  try {
    if (!(await tableExists(pool, 'tenants'))) {
      console.error('Control DB has no tenants table. Run: npm run db:control:setup');
      process.exit(1);
    }

    for (const file of migrations) {
      const sqlPath = path.join(__dirname, '../database/migrations/control', file);
      if (!fs.existsSync(sqlPath)) {
        console.warn('Skipping missing migration:', file);
        continue;
      }
      console.log('Applying', file, '...');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await pool.query(sql);
      console.log('  OK');
    }

    console.log('All app-admin control migrations applied.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
