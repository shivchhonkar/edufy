/**
 * Apply Phase 5 control DB migration (subscriptions, leads, curriculum, parent links).
 * Usage: node scripts/migrate-phase5.js
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
  database: process.env.CONTROL_DB_NAME || 'Shribi Edufy_control',
};

async function main() {
  const sqlPath = path.join(__dirname, '../database/migrations/control/002_phase5_advanced.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const pool = new Pool(config);
  try {
    await pool.query(sql);
    console.log('Phase 5 control migration applied.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
