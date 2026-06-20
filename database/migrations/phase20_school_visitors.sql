-- Visitor management: check-in records and SMS notifications
CREATE TABLE IF NOT EXISTS school_visitors (
  id SERIAL PRIMARY KEY,
  visitor_number VARCHAR(50) NOT NULL UNIQUE,
  visitor_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  purpose TEXT NOT NULL,
  person_to_meet VARCHAR(255) NOT NULL,
  host_phone VARCHAR(20),
  department VARCHAR(120),
  id_proof_type VARCHAR(50),
  id_proof_number VARCHAR(80),
  vehicle_number VARCHAR(30),
  check_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  check_out_at TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'checked_in' CHECK (
    status IN ('checked_in', 'checked_out')
  ),
  sms_sent_at TIMESTAMP,
  sms_sent_to VARCHAR(20),
  sms_status VARCHAR(20) CHECK (
    sms_status IN ('pending', 'sent', 'failed', 'skipped')
  ),
  sms_error TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_by_name VARCHAR(200),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_school_visitors_status
  ON school_visitors (status, check_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_school_visitors_check_in
  ON school_visitors (check_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_school_visitors_number
  ON school_visitors (visitor_number);
