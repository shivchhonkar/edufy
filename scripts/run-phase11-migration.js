/**
 * Run phase11 class_sections migration on one or more databases.
 * Usage:
 *   node scripts/run-phase11-migration.js
 *   node scripts/run-phase11-migration.js edulakhya_gla edu_crm
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../apps/super-admin/.env.local') });

const sql = fs.readFileSync(
  path.join(__dirname, '../database/migrations/phase11_class_sections.sql'),
  'utf8'
);

const defaultDbs = [
  process.env.DB_NAME || 'edu_crm',
  'edulakhya_gla',
];

const databases = process.argv.slice(2).length ? process.argv.slice(2) : defaultDbs;

async function migrate(dbName) {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: dbName,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'shiv',
  });

  try {
    await pool.query(sql);
    const check = await pool.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'class_sections'
      ) AS exists`
    );
    console.log(`✅ ${dbName}: class_sections exists = ${check.rows[0].exists}`);
  } catch (err) {
    console.error(`❌ ${dbName}:`, err.message);
  } finally {
    await pool.end();
  }
}

(async () => {
  const unique = [...new Set(databases)];
  console.log('Running phase11_class_sections on:', unique.join(', '));
  for (const db of unique) {
    await migrate(db);
  }
})();
