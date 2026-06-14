import { Pool } from 'pg';
import { readFileSync } from 'fs';
import path from 'path';

function getDbConfig() {
  return {
    host: process.env.CONTROL_DB_HOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.CONTROL_DB_PORT || process.env.DB_PORT || '5432', 10),
    user: process.env.CONTROL_DB_USER || process.env.DB_USER || 'postgres',
    password: process.env.CONTROL_DB_PASSWORD || process.env.DB_PASSWORD || '',
  };
}

function getControlDbName(): string {
  return process.env.CONTROL_DB_NAME || 'edulakhya_control';
}

function resolveControlSchemaSql(): string {
  const candidates = [
    path.join(process.cwd(), '..', '..', 'database', 'control_schema.sql'),
    path.join(process.cwd(), 'database', 'control_schema.sql'),
    path.join(process.cwd(), '..', '..', '..', 'database', 'control_schema.sql'),
  ];
  for (const filePath of candidates) {
    try {
      return readFileSync(filePath, 'utf8');
    } catch {
      // try next path
    }
  }
  throw new Error('control_schema.sql not found');
}

/**
 * Ensures the multi-tenant control database exists and has the registry schema.
 * Safe to call before school registration or slug checks.
 */
export async function ensureControlDatabase(): Promise<void> {
  const config = getDbConfig();
  const controlDbName = getControlDbName();

  const admin = new Pool({ ...config, database: 'postgres' });
  try {
    const exists = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [controlDbName]
    );
    if (exists.rows.length === 0) {
      await admin.query(`CREATE DATABASE "${controlDbName}"`);
    }
  } finally {
    await admin.end();
  }

  const control = new Pool({ ...config, database: controlDbName });
  try {
    const tableCheck = await control.query<{ reg: string | null }>(
      "SELECT to_regclass('public.tenants') AS reg"
    );
    if (!tableCheck.rows[0]?.reg) {
      const schemaSql = resolveControlSchemaSql();
      await control.query(schemaSql);
    }
  } finally {
    await control.end();
  }
}
