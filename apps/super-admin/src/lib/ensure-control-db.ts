import { createPlatformPool, getControlDbConfig } from '@/lib/platform-db-config';
import { readDatabaseSql } from '@/lib/database-files';

/**
 * Ensures the multi-tenant control database exists and has the registry schema.
 * Safe to call before school registration or slug checks.
 */
export async function ensureControlDatabase(): Promise<void> {
  const controlDbName = getControlDbConfig().database;

  const admin = createPlatformPool(getControlDbConfig('postgres'));
  try {
    const exists = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [controlDbName],
    );
    if (exists.rows.length === 0) {
      await admin.query(`CREATE DATABASE "${controlDbName}"`);
    }
  } finally {
    await admin.end();
  }

  const control = createPlatformPool(getControlDbConfig(controlDbName));
  try {
    const tableCheck = await control.query<{ reg: string | null }>(
      "SELECT to_regclass('public.tenants') AS reg",
    );
    if (!tableCheck.rows[0]?.reg) {
      const schemaSql = readDatabaseSql('control_schema.sql');
      await control.query(schemaSql);
    }
  } finally {
    await control.end();
  }
}
