/**
 * Interactive script to create a platform admin user.
 * Usage: node scripts/create-admin-user.js
 *    or: npm run create:admin
 */

const bcrypt = require('bcryptjs');
const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

const { Client } = pg;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

function getDbConfig() {
  return {
    host: process.env.CONTROL_DB_HOST || 'localhost',
    port: parseInt(process.env.CONTROL_DB_PORT || '5432', 10),
    database: process.env.CONTROL_DB_NAME || 'Shribi Edufy_control',
    user: process.env.CONTROL_DB_USER || 'postgres',
    password: process.env.CONTROL_DB_PASSWORD || '',
  };
}

async function ensurePlatformAdminsTable(client) {
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
}

async function createAdminUser() {
  console.log('\nPlatform admin user creation\n');

  const client = new Client(getDbConfig());

  try {
    await client.connect();
    await ensurePlatformAdminsTable(client);

    const fullName = (await question('Enter admin name: ')).trim();
    const email = (await question('Enter admin email: ')).trim().toLowerCase();
    const password = await question('Enter password: ');

    if (!fullName || !email || !password) {
      console.error('\nName, email, and password are required.');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('\nPassword must be at least 6 characters.');
      process.exit(1);
    }

    const existing = await client.query(
      `SELECT id, email, full_name FROM platform_admins WHERE LOWER(email) = $1 LIMIT 1`,
      [email],
    );

    if (existing.rows.length > 0) {
      console.error(`\nAdmin user with email ${email} already exists.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await client.query(
      `INSERT INTO platform_admins (email, password_hash, full_name, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id, email, full_name, is_active, created_at`,
      [email, passwordHash, fullName],
    );

    const admin = result.rows[0];
    const loginUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:7006';

    console.log('\nAdmin user created successfully.\n');
    console.log('Details:');
    console.log('  ID:', admin.id);
    console.log('  Name:', admin.full_name);
    console.log('  Email:', admin.email);
    console.log('  Active:', admin.is_active);
    console.log(`\nLogin at: ${loginUrl}/login`);
  } catch (error) {
    console.error('\nError creating admin user:', error.message);
    if (error.code === '23505') {
      console.error('Email already exists.');
    }
    process.exit(1);
  } finally {
    rl.close();
    await client.end();
  }
}

createAdminUser();
