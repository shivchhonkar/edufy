import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const { Client } = pg;

const email = process.argv[2] || 'platform@edulakhya.com';
const password = process.argv[3] || 'Platform@123';
const fullName = process.argv[4] || 'Platform Admin';

async function main() {
  const client = new Client({
    host: process.env.CONTROL_DB_HOST || 'localhost',
    port: parseInt(process.env.CONTROL_DB_PORT || '5432', 10),
    database: process.env.CONTROL_DB_NAME || 'Shribi Edufy_control',
    user: process.env.CONTROL_DB_USER || 'postgres',
    password: process.env.CONTROL_DB_PASSWORD || '',
  });

  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS platform_admins (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await client.query(
    `
    INSERT INTO platform_admins (email, password_hash, full_name, is_active)
    VALUES ($1, $2, $3, true)
    ON CONFLICT (email) DO UPDATE SET
      password_hash = EXCLUDED.password_hash,
      full_name = EXCLUDED.full_name,
      is_active = true
    RETURNING id, email, full_name
    `,
    [email.toLowerCase(), passwordHash, fullName],
  );

  console.log('Platform admin ready:');
  console.log(result.rows[0]);
  console.log(`Login: ${email}`);
  console.log(`Password: ${password}`);

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
