import type { RequestDb } from '@/lib/request-db';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS class_sections (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (class_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_class_sections_class ON class_sections (class_id);
CREATE INDEX IF NOT EXISTS idx_class_sections_section ON class_sections (section_id);

INSERT INTO class_sections (class_id, section_id)
SELECT s.class_id, s.id
FROM sections s
WHERE s.class_id IS NOT NULL
ON CONFLICT (class_id, section_id) DO NOTHING;

ALTER TABLE sections ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE classes ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  ALTER TABLE sections ALTER COLUMN class_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;
`;

/** Idempotent — safe to call on every request; creates class_sections if missing. */
export async function ensureClassSectionsTable(db: RequestDb): Promise<void> {
  await db.query(MIGRATION_SQL);
}
