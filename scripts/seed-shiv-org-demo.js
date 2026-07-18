/**
 * Seed demo data for multi-school switcher under the "shiv" organization.
 *
 * Creates:
 *  - organization_branding (subdomain: shiv-hq) — single org login URL for all schools
 *  - second school: shiv-campus2 (Shiv Campus 2)
 *  - org user: hq@shiv.org / OrgDemo@123 with access to both schools
 *
 * Usage:
 *   node scripts/seed-shiv-org-demo.js
 *   node scripts/seed-shiv-org-demo.js --dry-run
 *
 * Requires: control DB migrations (npm run db:control:migrate-orgs)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../apps/super-admin/.env.local') });
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dryRun = process.argv.includes('--dry-run');

const ORG_SLUG = 'shiv';
const ORG_BRANDING_SUBDOMAIN = 'shiv-hq';
const SECOND_SCHOOL = {
  slug: 'shiv-campus2',
  name: 'Shiv Campus 2',
  city: 'Noida',
  admin_email: 'admin@shiv-campus2.local',
  admin_name: 'Campus 2 Admin',
  admin_password: 'Campus2@123',
};
const ORG_USER = {
  email: 'hq@shiv.org',
  password: 'OrgDemo@123',
  full_name: 'Shiv HQ Admin',
  role: 'org_owner',
};

const REGISTER_SCHOOL_MIGRATION_FILES = [
  'phase1_student_columns.sql',
  'phase2_student_guardians.sql',
  'phase3_student_documents.sql',
  'phase4_student_medical_records.sql',
  'phase5_student_enrollments.sql',
  'phase6_enrollment_history.sql',
  'phase7_sms_communications.sql',
  'phase8_admission_inquiries.sql',
  'phase8_communications_extended.sql',
  'phase9_platform_modules.sql',
  'phase10_classes_is_active.sql',
  'phase11_class_sections.sql',
  'phase12_exams_subject_id.sql',
  'add_academic_years_table.sql',
  'add_system_settings_table.sql',
  'phase13_system_settings.sql',
  'phase14_transfer_certificate_generations.sql',
  'phase15_student_gate_passes.sql',
  'phase16_school_houses.sql',
  'phase17_student_mother_fields.sql',
  'phase18_student_portal_password.sql',
  'phase19_portal_access.sql',
  'phase20_school_visitors.sql',
  'phase22_admission_inquiry_parent_relation.sql',
];

function pgConfig(database) {
  return {
    host: process.env.CONTROL_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.CONTROL_DB_PORT || process.env.DB_PORT || '5432', 10),
    user: process.env.CONTROL_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.CONTROL_DB_PASSWORD || process.env.DB_PASSWORD || 'shiv',
    database,
  };
}

function resolveDatabaseFile(...segments) {
  const roots = [
    process.env.EDUFY_DATABASE_DIR,
    path.join(__dirname, '../database'),
    path.join(__dirname, '../apps/super-admin/database'),
  ].filter(Boolean);

  for (const root of roots) {
    const filePath = path.join(root, ...segments);
    if (fs.existsSync(filePath)) return filePath;
  }
  throw new Error(`Database file not found: ${segments.join('/')}`);
}

function getDefaultAcademicYear() {
  const now = new Date();
  const y = now.getFullYear();
  const startYear = now.getMonth() >= 3 ? y : y - 1;
  const endYear = startYear + 1;
  return {
    name: `${startYear}-${String(endYear).slice(-2)}`,
    start_date: `${startYear}-04-01`,
    end_date: `${endYear}-03-31`,
  };
}

async function provisionSchoolDb(input) {
  const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const dbName = `Shribi Edufy_${slug.replace(/-/g, '_')}`;
  const year = getDefaultAcademicYear();

  const adminPool = new Pool(pgConfig('postgres'));
  try {
    await adminPool.query(`CREATE DATABASE "${dbName}"`);
    console.log(`  Created database: ${dbName}`);
  } catch (err) {
    if (!String(err.message).includes('already exists')) throw err;
    console.log(`  Database already exists: ${dbName}`);
  } finally {
    await adminPool.end();
  }

  const schemaSql = fs.readFileSync(resolveDatabaseFile('schema.sql'), 'utf8');
  const schoolPool = new Pool(pgConfig(dbName));
  try {
    await schoolPool.query(schemaSql);

    const migrationsDir = resolveDatabaseFile('migrations');
    for (const file of REGISTER_SCHOOL_MIGRATION_FILES) {
      const migrationPath = path.join(migrationsDir, file);
      if (fs.existsSync(migrationPath)) {
        await schoolPool.query(fs.readFileSync(migrationPath, 'utf8'));
      }
    }

    const passwordHash = await bcrypt.hash(input.admin_password, 10);
    const existingUser = await schoolPool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [input.admin_email],
    );
    if (existingUser.rows.length === 0) {
      await schoolPool.query(
        `INSERT INTO users (email, password_hash, role, full_name, is_active)
         VALUES ($1, $2, 'super_admin', $3, true)`,
        [input.admin_email, passwordHash, input.admin_name],
      );
    }

    await schoolPool.query(`
      CREATE TABLE IF NOT EXISTS academic_years (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        school_name VARCHAR(255),
        school_address TEXT,
        school_phone VARCHAR(20),
        school_email VARCHAR(255),
        academic_year VARCHAR(50),
        currency VARCHAR(10) DEFAULT 'INR',
        date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
        timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
        late_fee_percentage DECIMAL(5, 2) DEFAULT 2.00,
        late_fee_days INTEGER DEFAULT 7,
        auto_assign_fees BOOLEAN DEFAULT true,
        send_notifications BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await schoolPool.query(
      `INSERT INTO academic_years (name, start_date, end_date, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (name) DO UPDATE SET is_active = true`,
      [year.name, year.start_date, year.end_date],
    );

    const settings = await schoolPool.query('SELECT id FROM system_settings LIMIT 1');
    if (settings.rows.length === 0) {
      await schoolPool.query(
        `INSERT INTO system_settings (school_name, school_email, academic_year, currency, school_address, school_phone)
         VALUES ($1, $2, $3, 'INR', 'Demo Address, Noida', '9876543210')`,
        [input.name, input.admin_email, year.name],
      );
    }

    await schoolPool
      .query(
        `INSERT INTO school_setup_progress (current_step, completed_steps, is_complete)
         VALUES (1, '[]'::jsonb, false)`,
      )
      .catch(() => {});
  } finally {
    await schoolPool.end();
  }

  return { slug, dbName, year };
}

async function main() {
  const control = new Pool(pgConfig(process.env.CONTROL_DB_NAME || 'Shribi Edufy_control'));

  try {
    const orgResult = await control.query(
      `SELECT o.* FROM organizations o WHERE o.slug = $1`,
      [ORG_SLUG],
    );
    if (orgResult.rows.length === 0) {
      console.error(`Organization "${ORG_SLUG}" not found. Run: npm run db:control:migrate-orgs`);
      process.exit(1);
    }
    const org = orgResult.rows[0];
    console.log(`Organization: ${org.name} (id=${org.id})`);

    const primarySchool = await control.query(
      `SELECT * FROM tenants WHERE organization_id = $1 AND slug = $2`,
      [org.id, ORG_SLUG],
    );
    if (primarySchool.rows.length === 0) {
      console.error(`Primary school "${ORG_SLUG}" not found under org.`);
      process.exit(1);
    }
    const primary = primarySchool.rows[0];
    console.log(`Primary school: ${primary.name} (id=${primary.id}, ${primary.slug}.localhost:7000)`);

    if (dryRun) {
      console.log('[dry-run] Would update org type, branding, second school, org user');
      return;
    }

    await control.query(
      `UPDATE organizations SET type = 'chain', name = COALESCE(NULLIF(name, ''), 'Shiv School Group'), updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [org.id],
    );

    const brandingCheck = await control.query(
      'SELECT organization_id FROM organization_branding WHERE organization_id = $1 OR subdomain = $2',
      [org.id, ORG_BRANDING_SUBDOMAIN],
    );
    if (brandingCheck.rows.length === 0) {
      await control.query(
        `INSERT INTO organization_branding (organization_id, subdomain, primary_color, secondary_color, tagline)
         VALUES ($1, $2, '#2563eb', '#1e40af', 'Shiv School Group — HQ Portal')`,
        [org.id, ORG_BRANDING_SUBDOMAIN],
      );
      console.log(`Org branding: ${ORG_BRANDING_SUBDOMAIN}.localhost:7000`);
    } else {
      console.log('Org branding already configured.');
    }

    let secondTenantId;
    const secondCheck = await control.query('SELECT * FROM tenants WHERE slug = $1', [
      SECOND_SCHOOL.slug,
    ]);

    if (secondCheck.rows.length === 0) {
      console.log(`Provisioning second school: ${SECOND_SCHOOL.name}…`);
      const { slug, dbName } = await provisionSchoolDb(SECOND_SCHOOL);
      const insert = await control.query(
        `INSERT INTO tenants (organization_id, slug, name, db_name, is_active, is_primary, city)
         VALUES ($1, $2, $3, $4, true, false, $5)
         RETURNING id`,
        [org.id, slug, SECOND_SCHOOL.name, dbName, SECOND_SCHOOL.city],
      );
      secondTenantId = insert.rows[0].id;
      await control.query(
        `INSERT INTO tenant_branding (tenant_id, subdomain, primary_color, secondary_color)
         VALUES ($1, $2, '#059669', '#1e40af')`,
        [secondTenantId, slug],
      );
      console.log(`Second school created: ${SECOND_SCHOOL.name} (id=${secondTenantId}, ${slug}.localhost:7000)`);
    } else {
      secondTenantId = secondCheck.rows[0].id;
      if (secondCheck.rows[0].organization_id !== org.id) {
        await control.query('UPDATE tenants SET organization_id = $1 WHERE id = $2', [
          org.id,
          secondTenantId,
        ]);
      }
      console.log(`Second school already exists: id=${secondTenantId}`);
    }

    const passwordHash = await bcrypt.hash(ORG_USER.password, 10);
    let orgUserId;
    const userCheck = await control.query(
      'SELECT id FROM organization_users WHERE organization_id = $1 AND LOWER(email) = LOWER($2)',
      [org.id, ORG_USER.email],
    );

    if (userCheck.rows.length === 0) {
      const userInsert = await control.query(
        `INSERT INTO organization_users (organization_id, email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [org.id, ORG_USER.email, passwordHash, ORG_USER.full_name, ORG_USER.role],
      );
      orgUserId = userInsert.rows[0].id;
      console.log(`Org user created: ${ORG_USER.email}`);
    } else {
      orgUserId = userCheck.rows[0].id;
      await control.query(
        'UPDATE organization_users SET password_hash = $1, full_name = $2, role = $3, is_active = true WHERE id = $4',
        [passwordHash, ORG_USER.full_name, ORG_USER.role, orgUserId],
      );
      console.log(`Org user updated: ${ORG_USER.email}`);
    }

    for (const [tenantId, isDefault] of [
      [primary.id, true],
      [secondTenantId, false],
    ]) {
      await control.query(
        `INSERT INTO user_school_access (organization_user_id, tenant_id, role, is_default)
         VALUES ($1, $2, 'school_admin', $3)
         ON CONFLICT (organization_user_id, tenant_id)
         DO UPDATE SET is_default = EXCLUDED.is_default, role = EXCLUDED.role`,
        [orgUserId, tenantId, isDefault],
      );
    }
    console.log('School access granted for both campuses.');

    const baseDomain = process.env.APP_BASE_DOMAIN || 'localhost:7000';
    console.log('\n--- Demo ready ---');
    console.log('Organization login (single URL for all schools):');
    console.log(`  URL:      http://${ORG_BRANDING_SUBDOMAIN}.${baseDomain}/login`);
    console.log(`  Flow:     Select school → enter credentials`);
    console.log(`  Org user: ${ORG_USER.email} / ${ORG_USER.password}`);
    console.log(`  Campus 2 admin: ${SECOND_SCHOOL.admin_email} / ${SECOND_SCHOOL.admin_password}`);
    console.log('\nLegacy direct school URLs (still supported):');
    console.log(`  ${primary.slug}.${baseDomain}  → ${primary.name}`);
    console.log(`  ${SECOND_SCHOOL.slug}.${baseDomain}  → ${SECOND_SCHOOL.name}`);
    console.log('\nAfter login, use the header school switcher or Change school on the login page.');
  } finally {
    await control.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
