import type { RequestDb } from '@/lib/request-db'

export async function ensureStudentPortalSchema(db: RequestDb) {
  await db.query(`
    ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_password_hash VARCHAR(255);
    ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_password_set_at TIMESTAMP;
  `)
}
