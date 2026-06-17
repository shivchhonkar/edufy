-- Phase 1: Extend students table with missing profile columns
-- Safe to re-run (IF NOT EXISTS)

ALTER TABLE students ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_code VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS aadhaar_no VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS religion VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS caste VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE students ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_tongue VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS remarks TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_code
  ON students (student_code)
  WHERE student_code IS NOT NULL AND student_code <> '';

CREATE INDEX IF NOT EXISTS idx_students_aadhaar_no
  ON students (aadhaar_no)
  WHERE aadhaar_no IS NOT NULL AND aadhaar_no <> '';
