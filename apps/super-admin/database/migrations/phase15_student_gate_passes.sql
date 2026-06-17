-- Student gate pass exit authorization and audit trail
CREATE TABLE IF NOT EXISTS student_gate_passes (
  id SERIAL PRIMARY KEY,
  pass_number VARCHAR(50) NOT NULL UNIQUE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  collector_name VARCHAR(255) NOT NULL,
  collector_mobile VARCHAR(20) NOT NULL,
  collector_relationship VARCHAR(50) NOT NULL,
  collector_photo_url TEXT,
  reason TEXT NOT NULL,
  approval_method VARCHAR(30) CHECK (
    approval_method IN ('parent_otp', 'principal', 'authorized_staff')
  ),
  otp_session_id VARCHAR(255),
  otp_sent_to_mobile VARCHAR(20),
  otp_verified_at TIMESTAMP,
  approved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by_name VARCHAR(200),
  approved_at TIMESTAMP,
  exit_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'cancelled')
  ),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by_name VARCHAR(200),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_gate_passes_student
  ON student_gate_passes (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gate_passes_status
  ON student_gate_passes (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gate_passes_exit_at
  ON student_gate_passes (exit_at DESC);

CREATE INDEX IF NOT EXISTS idx_gate_passes_pass_number
  ON student_gate_passes (pass_number);
