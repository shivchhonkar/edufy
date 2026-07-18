import type { Pool } from 'pg';
import { readDatabaseSql } from '@/lib/database-files';

let organizationsSchemaReady = false;

/**
 * Ensures organization-layer tables exist on the control DB.
 * Safe to call before school registration or org migration.
 */
export async function ensureOrganizationsSchema(control: Pool): Promise<void> {
  if (organizationsSchemaReady) return;

  const check = await control.query<{ reg: string | null }>(
    "SELECT to_regclass('public.organizations') AS reg",
  );

  if (!check.rows[0]?.reg) {
    const migrationSql = readDatabaseSql('migrations', 'control', '001_organizations.sql');
    await control.query(migrationSql);
  }

  const phase5 = await control.query<{ reg: string | null }>(
    "SELECT to_regclass('public.organization_subscriptions') AS reg",
  );
  if (!phase5.rows[0]?.reg) {
    try {
      const phase5Sql = readDatabaseSql('migrations', 'control', '002_phase5_advanced.sql');
      await control.query(phase5Sql);
    } catch {
      // optional if file missing on server
    }
  }

  const schoolCodeCol = await control.query<{ col: string | null }>(
    `SELECT column_name AS col FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'organizations' AND column_name = 'school_code'`,
  );
  if (!schoolCodeCol.rows[0]?.col) {
    try {
      const schoolCodeSql = readDatabaseSql('migrations', 'control', '003_organization_school_code.sql');
      await control.query(schoolCodeSql);
    } catch {
      // optional if file missing on server
    }
  }

  organizationsSchemaReady = true;
}
