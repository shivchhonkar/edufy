import bcrypt from 'bcryptjs';
import pg from 'pg';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const { Client } = pg;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function main() {
  const control = new Client({
    host: process.env.CONTROL_DB_HOST || 'localhost',
    port: parseInt(process.env.CONTROL_DB_PORT || '5432', 10),
    database: process.env.CONTROL_DB_NAME || 'Shribi Edufy_control',
    user: process.env.CONTROL_DB_USER || 'postgres',
    password: process.env.CONTROL_DB_PASSWORD || '',
  });
  await control.connect();

  const orgRes = await control.query('SELECT * FROM organizations WHERE id = 1');
  console.log('org columns', orgRes.rows[0] ? Object.keys(orgRes.rows[0]) : null);

  const schoolsRes = await control.query(
    'SELECT id, slug, name FROM tenants WHERE organization_id = 1 AND is_active = true',
  );
  console.log('schools', schoolsRes.rows);

  const tenantRes = await control.query(
    `SELECT t.* FROM tenants t INNER JOIN tenant_branding b ON b.tenant_id = t.id WHERE LOWER(b.subdomain) = 'global' LIMIT 1`,
  );
  const tenant = tenantRes.rows[0];
  await control.end();

  const school = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: tenant.db_name,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  });
  await school.connect();
  const userRes = await school.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true',
    ['beenu@gmail.com'],
  );
  const user = userRes.rows[0];
  await school.end();

  const org = orgRes.rows[0];
  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    user_type: 'school_local',
    organization_id: tenant.organization_id,
    organization_slug: org?.slug,
    tenant_id: tenant.id,
    tenant_slug: tenant.slug,
    school_id: tenant.id,
    school_slug: tenant.slug,
    accessible_school_ids: schoolsRes.rows.map((s) => s.id),
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });
  const { password_hash, ...userSafe } = user;
  const body = {
    success: true,
    data: {
      user: userSafe,
      token,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        organization_id: tenant.organization_id,
      },
    },
    message: 'Login successful',
  };

  const json = JSON.stringify(body);
  console.log('response size', json.length);
  console.log('token length', token.length);
  console.log('user keys', Object.keys(userSafe));
}

main().catch((e) => {
  console.error('ERROR', e);
  process.exit(1);
});
