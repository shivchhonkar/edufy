import { existsSync, readFileSync } from 'fs';
import path from 'path';
import type { Pool } from 'pg';
import { createControlPool } from '@/lib/platform-db-config';

let controlSchemaReady = false;

function readControlMigration(filename: string): string | null {
  const candidates = [
    path.join(process.cwd(), 'database', 'migrations', 'control', filename),
    path.join(process.cwd(), '..', '..', 'database', 'migrations', 'control', filename),
    path.join(process.cwd(), '..', 'database', 'migrations', 'control', filename),
  ];

  for (const filePath of candidates) {
    if (existsSync(filePath)) {
      return readFileSync(filePath, 'utf8');
    }
  }

  return null;
}

async function tableExists(pool: Pool, tableName: string): Promise<boolean> {
  const result = await pool.query<{ reg: string | null }>(
    'SELECT to_regclass($1) AS reg',
    [`public.${tableName}`],
  );
  return !!result.rows[0]?.reg;
}

async function columnExists(pool: Pool, tableName: string, columnName: string): Promise<boolean> {
  const result = await pool.query<{ col: string | null }>(
    `SELECT column_name AS col
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2`,
    [tableName, columnName],
  );
  return !!result.rows[0]?.col;
}

/**
 * Ensures control DB tables/columns required by app-admin platform APIs exist.
 * Safe to call before every platform query (runs once per process).
 */
export async function ensureControlSchema(): Promise<void> {
  if (controlSchemaReady) return;

  const pool = createControlPool();
  try {
    const hasTenants = await tableExists(pool, 'tenants');
    if (!hasTenants) {
      throw new Error(
        'Control database is missing the tenants table. Run: npm run db:control:setup',
      );
    }

    const hasOrganizations = await tableExists(pool, 'organizations');
    if (!hasOrganizations) {
      const sql = readControlMigration('001_organizations.sql');
      if (sql) {
        await pool.query(sql);
      }
    }

    const hasSubscriptions = await tableExists(pool, 'organization_subscriptions');
    if (!hasSubscriptions) {
      const sql = readControlMigration('002_phase5_advanced.sql');
      if (sql) {
        await pool.query(sql);
      }
    }

    const hasSchoolCode = await columnExists(pool, 'organizations', 'school_code');
    if (!hasSchoolCode) {
      const sql = readControlMigration('003_organization_school_code.sql');
      if (sql) {
        await pool.query(sql);
      }
    }

    controlSchemaReady = true;
  } finally {
    await pool.end();
  }
}
