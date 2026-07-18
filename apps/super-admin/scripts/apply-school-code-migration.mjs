import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Client } = pg;

async function main() {
  const client = new Client({
    host: process.env.CONTROL_DB_HOST || 'localhost',
    port: parseInt(process.env.CONTROL_DB_PORT || '5432', 10),
    database: process.env.CONTROL_DB_NAME || 'Shribi Edufy_control',
    user: process.env.CONTROL_DB_USER || 'postgres',
    password: process.env.CONTROL_DB_PASSWORD || '',
  });
  await client.connect();

  const migrationPath = path.join(__dirname, '../../../database/migrations/control/003_organization_school_code.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  await client.query(sql);

  await client.query(
    `UPDATE organizations SET school_code = 'GLOBAL'
     WHERE slug = 'global' AND (school_code IS NULL OR school_code = '')`,
  );

  const res = await client.query(
    'SELECT id, slug, school_code FROM organizations ORDER BY id',
  );
  console.log('organizations:', res.rows);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
