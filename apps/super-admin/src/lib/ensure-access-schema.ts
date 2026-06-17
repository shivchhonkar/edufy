import type { RequestDb } from '@/lib/request-db'

export async function ensureAccessSchema(db: RequestDb) {
  await db.query(`
    ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_access_enabled BOOLEAN DEFAULT true;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_permissions JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_password_hash VARCHAR(255);
    ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_password_set_at TIMESTAMP;

    ALTER TABLE staff ADD COLUMN IF NOT EXISTS portal_access_enabled BOOLEAN DEFAULT true;
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS portal_permissions JSONB DEFAULT '{}'::jsonb;

    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS parent_portal_defaults JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS staff_portal_defaults JSONB DEFAULT '{}'::jsonb;
  `)
}

export async function getSystemSettingsRow(db: RequestDb) {
  const result = await db.query(
    `SELECT id, parent_portal_defaults, staff_portal_defaults FROM system_settings ORDER BY id DESC LIMIT 1`,
  )
  return result.rows[0] as
    | { id: number; parent_portal_defaults: unknown; staff_portal_defaults: unknown }
    | undefined
}
