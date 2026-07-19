import { hashPassword } from '@edulakhya/auth';
import { queryForTenant, type TenantDbConfig } from '@edulakhya/database';
import { getTenantDbConfig } from '@edulakhya/tenant';
import type { OrganizationSubscription, Tenant } from '@edulakhya/types';
import { createControlPool } from '@/lib/platform-db-config';

export type SchoolListItem = {
  id: number;
  slug: string;
  name: string;
  is_active: boolean;
  organization_id: number | null;
  organization_name: string | null;
  db_name: string;
};

export type SuperAdminUser = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

export type SchoolProfile = {
  academic_year: string | null;
  timezone: string | null;
  school_name: string | null;
  last_login: string | null;
};

export type SchoolSubscriptionSummary = {
  plan: string;
  status: string;
  billing_cycle: string | null;
  valid_until: string | null;
  valid_from: string | null;
  school_count_limit: number | null;
  student_count_limit: number | null;
} | null;

export type AuditModuleItem = {
  name: string;
  enabled: boolean;
};

export type ClassSectionRow = {
  class_id: number;
  class_name: string;
  section_id: number | null;
  section_name: string;
  student_count: number;
};

export type FeeStructureRow = {
  id: number;
  class_name: string | null;
  fee_type: string;
  amount: number;
  frequency: string | null;
  academic_year: string;
  is_active: boolean;
};

export type SchoolAuditReport = {
  school: {
    id: number;
    slug: string;
    name: string;
    code: string | null;
    organization_id: number | null;
    organization_name: string | null;
    organization_school_code: string | null;
    subdomain: string | null;
    is_active: boolean;
    db_name: string;
    created_at: string;
  };
  profile: SchoolProfile;
  subscription: SchoolSubscriptionSummary;
  generated_at: string;
  db_connected: boolean;
  db_error: string | null;
  counts: {
    students: number;
    staff: number;
    teachers: number;
    parents: number;
    classes: number;
    sections: number;
    fee_structures: number;
    admins: number;
  };
  modules: AuditModuleItem[];
  classes_with_sections: ClassSectionRow[];
  fee_structures: FeeStructureRow[];
  super_admins: SuperAdminUser[];
};

const AUDIT_MODULES = [
  'Admissions',
  'Attendance',
  'Fees',
  'Exams',
  'Timetable',
  'Library',
  'Transport',
  'Inventory',
  'Payroll',
  'SMS/Email',
  'Parent Portal',
  'Staff Portal',
  'Reports',
  'Hostel',
  'Online Classes',
] as const;

function mapSubscription(
  row: OrganizationSubscription | null | undefined,
): SchoolSubscriptionSummary {
  if (!row) return null;
  return {
    plan: row.plan,
    status: row.status,
    billing_cycle: row.billing_cycle ?? null,
    valid_until: row.valid_until ?? null,
    valid_from: row.valid_from ?? null,
    school_count_limit: row.school_count_limit ?? null,
    student_count_limit: row.student_count_limit ?? null,
  };
}

function buildModuleList(hasFees: boolean): AuditModuleItem[] {
  return AUDIT_MODULES.map((name) => ({
    name,
    enabled: name === 'Hostel' ? false : name === 'Fees' ? hasFees : true,
  }));
}

async function getTenantRecordById(tenantId: number): Promise<Tenant | null> {
  const pool = (await import('@/lib/platform-db-config')).createControlPool();
  try {
    const result = await pool.query<Tenant>('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    return result.rows[0] ?? null;
  } finally {
    await pool.end();
  }
}

async function loadTenantControlMeta(tenant: Tenant): Promise<{
  organization_name: string | null;
  organization_school_code: string | null;
  subdomain: string | null;
  subscription: SchoolSubscriptionSummary;
}> {
  const pool = createControlPool();
  try {
    const [brandingRes, orgRes] = await Promise.all([
      pool.query<{ subdomain: string }>(
        'SELECT subdomain FROM tenant_branding WHERE tenant_id = $1',
        [tenant.id],
      ),
      tenant.organization_id
        ? pool.query<{
            name: string;
            school_code: string | null;
            subscription: OrganizationSubscription | null;
          }>(
            `SELECT
               o.name,
               o.school_code,
               (
                 SELECT row_to_json(s.*)
                 FROM organization_subscriptions s
                 WHERE s.organization_id = o.id
                 ORDER BY s.valid_until DESC NULLS LAST, s.updated_at DESC
                 LIMIT 1
               ) AS subscription
             FROM organizations o
             WHERE o.id = $1`,
            [tenant.organization_id],
          )
        : Promise.resolve({ rows: [] as Array<{ name: string; school_code: string | null; subscription: OrganizationSubscription | null }> }),
    ]);

    const orgRow = orgRes.rows[0];
    return {
      organization_name: orgRow?.name ?? null,
      organization_school_code: orgRow?.school_code ?? null,
      subdomain: brandingRes.rows[0]?.subdomain ?? tenant.slug,
      subscription: mapSubscription(orgRow?.subscription),
    };
  } finally {
    await pool.end();
  }
}

async function safeQuery<T>(
  dbConfig: TenantDbConfig,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  try {
    const result = await queryForTenant<T>(dbConfig, sql, params);
    return result.rows;
  } catch {
    return [];
  }
}

async function safeCount(dbConfig: TenantDbConfig, sql: string): Promise<number> {
  const rows = await safeQuery<{ count: number }>(dbConfig, sql);
  return rows[0]?.count ?? 0;
}

async function pingDatabase(dbConfig: TenantDbConfig): Promise<{ ok: boolean; error: string | null }> {
  try {
    await queryForTenant(dbConfig, 'SELECT 1 AS ok');
    return { ok: true, error: null };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Database unreachable',
    };
  }
}

export async function listPlatformSchools(): Promise<SchoolListItem[]> {
  const pool = (await import('@/lib/platform-db-config')).createControlPool();
  try {
    const result = await pool.query<SchoolListItem>(`
      SELECT
        t.id,
        t.slug,
        t.name,
        t.is_active,
        t.organization_id,
        o.name AS organization_name,
        t.db_name
      FROM tenants t
      LEFT JOIN organizations o ON o.id = t.organization_id
      ORDER BY o.name NULLS LAST, t.name ASC
    `);
    return result.rows;
  } finally {
    await pool.end();
  }
}

export async function getSchoolSuperAdmins(tenantId: number): Promise<SuperAdminUser[]> {
  const tenant = await getTenantRecordById(tenantId);
  if (!tenant) return [];

  const dbConfig = getTenantDbConfig(tenant);
  return safeQuery<SuperAdminUser>(
    dbConfig,
    `SELECT
       id,
       email,
       full_name,
       phone,
       role,
       is_active,
       created_at::text AS created_at,
       updated_at::text AS last_login_at
     FROM users
     WHERE role IN ('super_admin', 'admin')
     ORDER BY CASE role WHEN 'super_admin' THEN 0 ELSE 1 END, full_name, email`,
  );
}

export async function resetSchoolSuperAdminPassword(
  tenantId: number,
  userId: number,
  newPassword: string,
): Promise<SuperAdminUser | null> {
  if (newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const tenant = await getTenantRecordById(tenantId);
  if (!tenant) {
    throw new Error('School not found.');
  }

  const dbConfig = getTenantDbConfig(tenant);
  const passwordHash = await hashPassword(newPassword);
  const result = await queryForTenant<SuperAdminUser>(
    dbConfig,
    `UPDATE users
     SET password_hash = $1, updated_at = NOW()
     WHERE id = $2 AND role IN ('super_admin', 'admin')
     RETURNING id, email, full_name, phone, role, is_active, created_at::text AS created_at, updated_at::text AS last_login_at`,
    [passwordHash, userId],
  );

  return result.rows[0] ?? null;
}

export async function getSchoolAuditReport(tenantId: number): Promise<SchoolAuditReport | null> {
  const tenant = await getTenantRecordById(tenantId);
  if (!tenant) return null;

  const controlMeta = await loadTenantControlMeta(tenant);
  const dbConfig = getTenantDbConfig(tenant);
  const ping = await pingDatabase(dbConfig);

  const [
    students,
    staff,
    teachers,
    parents,
    classes,
    sections,
    feeStructuresCount,
    profileRows,
    classesWithSections,
    feeStructures,
    superAdmins,
  ] = await Promise.all([
    safeCount(dbConfig, `SELECT COUNT(*)::int AS count FROM students WHERE status = 'active'`),
    safeCount(dbConfig, `SELECT COUNT(*)::int AS count FROM staff WHERE status = 'active'`),
    safeCount(
      dbConfig,
      `SELECT COUNT(*)::int AS count FROM users WHERE role = 'teacher' AND is_active = true`,
    ),
    safeCount(
      dbConfig,
      `SELECT COUNT(DISTINCT sg.id)::int AS count
       FROM student_guardians sg
       INNER JOIN students s ON s.id = sg.student_id
       WHERE s.status = 'active'`,
    ),
    safeCount(dbConfig, `SELECT COUNT(*)::int AS count FROM classes WHERE is_active = true`),
    safeCount(dbConfig, `SELECT COUNT(*)::int AS count FROM sections WHERE is_active = true`),
    safeCount(
      dbConfig,
      `SELECT COUNT(*)::int AS count FROM fee_structures WHERE COALESCE(is_active, true) = true`,
    ),
    safeQuery<{
      academic_year: string | null;
      timezone: string | null;
      school_name: string | null;
      last_login: string | null;
    }>(
      dbConfig,
      `SELECT
         ss.academic_year,
         ss.timezone,
         ss.school_name,
         (
           SELECT MAX(u.updated_at)::text
           FROM users u
           WHERE u.is_active = true
         ) AS last_login
       FROM system_settings ss
       ORDER BY ss.id DESC
       LIMIT 1`,
    ),
    safeQuery<ClassSectionRow>(
      dbConfig,
      `SELECT
         c.id AS class_id,
         c.name AS class_name,
         sec.id AS section_id,
         COALESCE(sec.name, '—') AS section_name,
         COUNT(s.id)::int AS student_count
       FROM students s
       INNER JOIN classes c ON c.id = s.class_id
       LEFT JOIN sections sec ON sec.id = s.section_id
       WHERE s.status = 'active'
       GROUP BY c.id, c.name, sec.id, sec.name
       ORDER BY c.name, sec.name NULLS LAST`,
    ),
    safeQuery<FeeStructureRow>(
      dbConfig,
      `SELECT
         fs.id,
         c.name AS class_name,
         fs.fee_type,
         fs.amount::float AS amount,
         fs.frequency,
         fs.academic_year,
         COALESCE(fs.is_active, true) AS is_active
       FROM fee_structures fs
       LEFT JOIN classes c ON fs.class_id = c.id
       ORDER BY c.name NULLS LAST, fs.fee_type`,
    ),
    getSchoolSuperAdmins(tenantId),
  ]);

  const profile = profileRows[0];

  return {
    school: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      code: tenant.code,
      organization_id: tenant.organization_id,
      organization_name: controlMeta.organization_name,
      organization_school_code: controlMeta.organization_school_code,
      subdomain: controlMeta.subdomain,
      is_active: tenant.is_active,
      db_name: tenant.db_name,
      created_at:
        tenant.created_at instanceof Date
          ? tenant.created_at.toISOString()
          : String(tenant.created_at),
    },
    profile: {
      academic_year: profile?.academic_year ?? null,
      timezone: profile?.timezone ?? 'Asia/Kolkata',
      school_name: profile?.school_name ?? tenant.name,
      last_login: profile?.last_login ?? null,
    },
    subscription: controlMeta.subscription,
    generated_at: new Date().toISOString(),
    db_connected: ping.ok,
    db_error: ping.error,
    counts: {
      students,
      staff,
      teachers,
      parents,
      classes,
      sections,
      fee_structures: feeStructuresCount,
      admins: superAdmins.length,
    },
    modules: buildModuleList(feeStructuresCount > 0),
    classes_with_sections: classesWithSections,
    fee_structures: feeStructures,
    super_admins: superAdmins,
  };
}

export async function aggregateSchoolMetrics(tenant: Tenant): Promise<{
  db_connected: boolean;
  students: number;
  teachers: number;
  staff: number;
  active_users: number;
  monthly_revenue: number;
  pending_payments: number;
}> {
  const dbConfig = getTenantDbConfig(tenant);
  const ping = await pingDatabase(dbConfig);
  if (!ping.ok) {
    return {
      db_connected: false,
      students: 0,
      teachers: 0,
      staff: 0,
      active_users: 0,
      monthly_revenue: 0,
      pending_payments: 0,
    };
  }

  const [students, teachers, staff, activeUsers, monthlyRevenue, pendingPayments] =
    await Promise.all([
    safeCount(dbConfig, `SELECT COUNT(*)::int AS count FROM students WHERE status = 'active'`),
    safeCount(
      dbConfig,
      `SELECT COUNT(*)::int AS count FROM users WHERE role = 'teacher' AND is_active = true`,
    ),
    safeCount(dbConfig, `SELECT COUNT(*)::int AS count FROM staff WHERE status = 'active'`),
    safeCount(dbConfig, `SELECT COUNT(*)::int AS count FROM users WHERE is_active = true`),
    safeCount(
      dbConfig,
      `SELECT COALESCE(SUM(amount_paid), 0)::float AS count
       FROM fee_payments
       WHERE status = 'completed'
         AND payment_date >= DATE_TRUNC('month', CURRENT_DATE)
         AND payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'`,
    ).then((value) => Math.round(value)),
    safeCount(
      dbConfig,
      `SELECT COALESCE(SUM(
         CASE WHEN sf.amount_due > sf.amount_paid
           THEN sf.amount_due - sf.amount_paid + COALESCE(sf.late_fee_amount, 0)
           ELSE 0 END
       ), 0)::float AS count
       FROM student_fees sf
       INNER JOIN students s ON s.id = sf.student_id
       WHERE s.status = 'active' AND sf.amount_due > sf.amount_paid`,
    ).then((value) => Math.round(value)),
  ]);

  return {
    db_connected: true,
    students,
    teachers,
    staff,
    active_users: activeUsers,
    monthly_revenue: monthlyRevenue,
    pending_payments: pendingPayments,
  };
}

export type DeleteInactiveSchoolResult = {
  id: number;
  slug: string;
  name: string;
  db_name: string;
  database_dropped: boolean;
};

async function dropSchoolDatabase(dbName: string): Promise<void> {
  const admin = (await import('@/lib/platform-db-config')).createAdminPool();
  try {
    await admin.query(
      `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [dbName],
    );
    await admin.query(`DROP DATABASE IF EXISTS "${dbName.replace(/"/g, '""')}"`);
  } finally {
    await admin.end();
  }
}

/** Permanently remove an inactive school from the control registry and drop its database. */
export async function deleteInactiveSchool(
  tenantId: number,
  confirmSlug: string,
): Promise<DeleteInactiveSchoolResult> {
  const pool = (await import('@/lib/platform-db-config')).createControlPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tenantRes = await client.query<{
      id: number;
      slug: string;
      name: string;
      db_name: string;
      is_active: boolean;
    }>(
      `SELECT id, slug, name, db_name, is_active
       FROM tenants
       WHERE id = $1
       FOR UPDATE`,
      [tenantId],
    );

    const tenant = tenantRes.rows[0];
    if (!tenant) {
      throw new Error('School not found.');
    }
    if (tenant.is_active) {
      throw new Error('Only inactive schools can be deleted. Deactivate the school first.');
    }
    if (tenant.slug.toLowerCase() !== confirmSlug.trim().toLowerCase()) {
      throw new Error('Confirmation slug does not match. Deletion cancelled.');
    }

    await client.query('DELETE FROM parent_school_links WHERE tenant_id = $1', [tenantId]).catch(() => {});
    await client.query('DELETE FROM admission_leads WHERE target_tenant_id = $1', [tenantId]).catch(() => {});
    await client.query(
      `DELETE FROM user_school_access
       WHERE tenant_id = $1`,
      [tenantId],
    );
    await client.query('DELETE FROM tenant_branding WHERE tenant_id = $1', [tenantId]);
    await client.query('DELETE FROM tenants WHERE id = $1', [tenantId]);

    await client.query('COMMIT');

    let databaseDropped = false;
    try {
      await dropSchoolDatabase(tenant.db_name);
      databaseDropped = true;
    } catch (error) {
      console.error('School registry removed but database drop failed:', error);
    }

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      db_name: tenant.db_name,
      database_dropped: databaseDropped,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
