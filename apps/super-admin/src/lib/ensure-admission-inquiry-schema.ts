import type { RequestDb } from '@/lib/request-db';

export async function ensureAdmissionInquirySchema(db: RequestDb): Promise<void> {
  await db.query(`
    ALTER TABLE admission_inquiries
      ADD COLUMN IF NOT EXISTS parent_relation VARCHAR(20) DEFAULT 'father'
      CHECK (parent_relation IN ('father', 'mother'));
  `);

  await db.query(`
    UPDATE admission_inquiries
    SET parent_relation = 'father'
    WHERE parent_relation IS NULL;
  `);
}
