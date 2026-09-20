import type { RequestDb } from '@/lib/request-db';

export async function ensureAdmissionInquirySchema(db: RequestDb): Promise<void> {
  await db.query(`
    ALTER TABLE admission_inquiries
      ADD COLUMN IF NOT EXISTS parent_relation VARCHAR(20) DEFAULT 'father',
      ADD COLUMN IF NOT EXISTS inquiry_date DATE DEFAULT CURRENT_DATE,
      ADD COLUMN IF NOT EXISTS enquiry_serial INTEGER,
      ADD COLUMN IF NOT EXISTS number_of_students INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS student_type VARCHAR(30) DEFAULT 'regular',
      ADD COLUMN IF NOT EXISTS student_title VARCHAR(20) DEFAULT 'Mst.',
      ADD COLUMN IF NOT EXISTS student_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS last_school VARCHAR(255),
      ADD COLUMN IF NOT EXISTS father_qualification VARCHAR(255),
      ADD COLUMN IF NOT EXISTS father_occupation VARCHAR(255),
      ADD COLUMN IF NOT EXISTS father_office_address TEXT,
      ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS mother_phone VARCHAR(30),
      ADD COLUMN IF NOT EXISTS mother_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS mother_qualification VARCHAR(255),
      ADD COLUMN IF NOT EXISTS mother_occupation VARCHAR(255),
      ADD COLUMN IF NOT EXISTS mother_office_address TEXT,
      ADD COLUMN IF NOT EXISTS location VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reporting VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reporting_mobile VARCHAR(30),
      ADD COLUMN IF NOT EXISTS additional_students JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS siblings JSONB DEFAULT '[]'::jsonb;
  `);

  await db.query(`
    UPDATE admission_inquiries
    SET parent_relation = 'father'
    WHERE parent_relation IS NULL;
  `);

  await db.query(`
    UPDATE admission_inquiries
    SET inquiry_date = COALESCE(inquiry_date, created_at::date, CURRENT_DATE)
    WHERE inquiry_date IS NULL;
  `);

  await db.query(`
    DO $$
    DECLARE rec RECORD;
    BEGIN
      FOR rec IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'admission_inquiries'
          AND c.contype = 'c'
          AND pg_get_constraintdef(c.oid) ILIKE '%source%'
      LOOP
        EXECUTE format('ALTER TABLE admission_inquiries DROP CONSTRAINT %I', rec.conname);
      END LOOP;

      ALTER TABLE admission_inquiries
        ADD CONSTRAINT admission_inquiries_source_check
        CHECK (source IN (
          'walk_in', 'phone', 'website', 'referral', 'social_media',
          'android', 'advertisement', 'other'
        ));
    EXCEPTION WHEN duplicate_object OR check_violation THEN
      NULL;
    END $$;
  `);

  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE admission_inquiries DROP CONSTRAINT IF EXISTS admission_inquiries_student_type_check;
      ALTER TABLE admission_inquiries
        ADD CONSTRAINT admission_inquiries_student_type_check
        CHECK (student_type IS NULL OR student_type IN ('regular', 'day_boarding', 'hostler'));
    EXCEPTION WHEN duplicate_object OR check_violation THEN
      NULL;
    END $$;
  `);

  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE admission_inquiries DROP CONSTRAINT IF EXISTS admission_inquiries_parent_relation_check;
      ALTER TABLE admission_inquiries
        ADD CONSTRAINT admission_inquiries_parent_relation_check
        CHECK (parent_relation IS NULL OR parent_relation IN ('father', 'mother'));
    EXCEPTION WHEN duplicate_object OR check_violation THEN
      NULL;
    END $$;
  `);
}
