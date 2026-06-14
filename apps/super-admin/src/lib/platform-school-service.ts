import { Pool } from 'pg';
import { readFileSync } from 'fs';
import path from 'path';
import { hashPassword } from '@/lib/auth';
import { ensureControlDatabase } from '@/lib/ensure-control-db';
import { getDefaultAcademicYearConfig } from '@/lib/academic-year-utils';

function controlPool(): Pool {
  return new Pool({
    host: process.env.CONTROL_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.CONTROL_DB_PORT || process.env.DB_PORT || '5432', 10),
    database: process.env.CONTROL_DB_NAME || 'edulakhya_control',
    user: process.env.CONTROL_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.CONTROL_DB_PASSWORD || process.env.DB_PASSWORD || '',
  });
}

function tenantPool(dbName: string): Pool {
  return new Pool({
    host: process.env.TENANT_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.TENANT_DB_PORT || process.env.DB_PORT || '5432', 10),
    database: dbName,
    user: process.env.TENANT_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.TENANT_DB_PASSWORD || process.env.DB_PASSWORD || '',
  });
}

function adminPool(): Pool {
  return new Pool({
    host: process.env.TENANT_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.TENANT_DB_PORT || process.env.DB_PORT || '5432', 10),
    database: 'postgres',
    user: process.env.TENANT_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.TENANT_DB_PASSWORD || process.env.DB_PASSWORD || '',
  });
}

export interface RegisterSchoolInput {
  school_name: string;
  slug: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
  admin_phone?: string;
  primary_color?: string;
  academic_year_name?: string;
  academic_year_start?: string;
  academic_year_end?: string;
}

export interface RegisterSchoolResult {
  tenant_id: number;
  slug: string;
  db_name: string;
  login_url: string;
  academic_year: string;
}

export async function registerSchool(
  input: RegisterSchoolInput
): Promise<RegisterSchoolResult> {
  const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!slug || slug.length < 3) {
    throw new Error('School slug must be at least 3 characters (letters, numbers, hyphens)');
  }

  const dbName = `Shribi Edufy_${slug.replace(/-/g, '_')}`;

  await ensureControlDatabase();

  const control = controlPool();

  const existing = await control.query(
    'SELECT id FROM tenants WHERE slug = $1 OR db_name = $2',
    [slug, dbName]
  );
  if (existing.rows.length > 0) {
    throw new Error('A school with this slug already exists');
  }

  const admin = adminPool();
  try {
    await admin.query(`CREATE DATABASE "${dbName}"`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes('already exists')) {
      throw new Error(`Failed to create school database: ${message}`);
    }
  } finally {
    await admin.end();
  }

  const schemaPath = path.join(process.cwd(), '..', '..', 'database', 'schema.sql');
  const altSchemaPath = path.join(process.cwd(), 'database', 'schema.sql');
  let schemaSql: string;
  try {
    schemaSql = readFileSync(schemaPath, 'utf8');
  } catch {
    schemaSql = readFileSync(altSchemaPath, 'utf8');
  }

  const schoolDb = tenantPool(dbName);
  try {
    await schoolDb.query(schemaSql);

    const migrationsDir = path.join(process.cwd(), '..', '..', 'database', 'migrations');
    const altMigrationsDir = path.join(process.cwd(), 'database', 'migrations');
    const migrationFiles = [
      'phase1_student_columns.sql',
      'phase2_student_guardians.sql',
      'phase3_student_documents.sql',
      'phase4_student_medical_records.sql',
      'phase5_student_enrollments.sql',
      'phase6_enrollment_history.sql',
      'phase7_sms_communications.sql',
      'phase8_admission_inquiries.sql',
      'phase9_platform_modules.sql',
      'phase10_classes_is_active.sql',
      'phase11_class_sections.sql',
      'add_academic_years_table.sql',
      'add_system_settings_table.sql',
      'phase13_system_settings.sql',
      'phase14_transfer_certificate_generations.sql',
    ];

    for (const file of migrationFiles) {
      try {
        const sql = readFileSync(path.join(migrationsDir, file), 'utf8');
        await schoolDb.query(sql);
      } catch {
        try {
          const sql = readFileSync(path.join(altMigrationsDir, file), 'utf8');
          await schoolDb.query(sql);
        } catch {
          // migration optional if not found
        }
      }
    }

    const passwordHash = await hashPassword(input.admin_password);
    await schoolDb.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone, is_active)
       VALUES ($1, $2, 'super_admin', $3, $4, true)`,
      [input.admin_email, passwordHash, input.admin_name, input.admin_phone || null]
    );

    const defaultYear = getDefaultAcademicYearConfig();
    const academicYearName = input.academic_year_name?.trim() || defaultYear.name;
    const academicYearStart = input.academic_year_start || defaultYear.start_date;
    const academicYearEnd = input.academic_year_end || defaultYear.end_date;

    // Ensure academic_years + system_settings tables exist
    await schoolDb.query(`
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

    await schoolDb.query(
      `INSERT INTO academic_years (name, start_date, end_date, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (name) DO UPDATE SET
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         is_active = true,
         updated_at = CURRENT_TIMESTAMP`,
      [academicYearName, academicYearStart, academicYearEnd]
    );

    await schoolDb.query(
      `INSERT INTO system_settings (school_name, school_email, school_phone, academic_year, currency)
       VALUES ($1, $2, $3, $4, 'INR')`,
      [
        input.school_name,
        input.admin_email,
        input.admin_phone || null,
        academicYearName,
      ]
    );

    await schoolDb.query(
      `INSERT INTO school_setup_progress (current_step, completed_steps, is_complete)
       VALUES (1, '[]'::jsonb, false)`
    ).catch(() => {});
  } finally {
    await schoolDb.end();
  }

  const tenantResult = await control.query(
    `INSERT INTO tenants (slug, name, db_name, is_active)
     VALUES ($1, $2, $3, true) RETURNING id`,
    [slug, input.school_name, dbName]
  );
  const tenantId = tenantResult.rows[0].id;

  await control.query(
    `INSERT INTO tenant_branding (tenant_id, subdomain, primary_color, secondary_color)
     VALUES ($1, $2, $3, '#1e40af')`,
    [tenantId, slug, input.primary_color || '#2563eb']
  );

  await control.end();

  const baseDomain = process.env.APP_BASE_DOMAIN || 'localhost:3000';
  const loginUrl = `http://${slug}.${baseDomain}/login`;

  return {
    tenant_id: tenantId,
    slug,
    db_name: dbName,
    login_url: loginUrl,
    academic_year: academicYearName,
  };
}
