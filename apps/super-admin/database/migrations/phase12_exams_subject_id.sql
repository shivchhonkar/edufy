-- Phase 12: exams.subject_id + academic_year for tenant DBs (e.g. edulakhya_gla)

ALTER TABLE exams ADD COLUMN IF NOT EXISTS subject_id INTEGER;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exams_subject_id_fkey'
  ) THEN
    ALTER TABLE exams
      ADD CONSTRAINT exams_subject_id_fkey
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject_id);
