-- Transfer certificate generation history (one row per print)
CREATE TABLE IF NOT EXISTS transfer_certificate_generations (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tc_number VARCHAR(100) NOT NULL,
  generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  generated_by_name VARCHAR(200),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  academic_year VARCHAR(20),
  student_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  school_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  options JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tc_generations_student
  ON transfer_certificate_generations (student_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tc_generations_generated_at
  ON transfer_certificate_generations (generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_tc_generations_tc_number
  ON transfer_certificate_generations (tc_number);
