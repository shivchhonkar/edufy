-- Phase 6: Allow multiple enrollment rows per academic year (full promotion history)
-- Replaces UNIQUE(student_id, academic_year) with one current enrollment per student.

ALTER TABLE student_enrollments
  DROP CONSTRAINT IF EXISTS student_enrollments_student_id_academic_year_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_enrollments_one_current_per_student
  ON student_enrollments (student_id)
  WHERE is_current = true;
