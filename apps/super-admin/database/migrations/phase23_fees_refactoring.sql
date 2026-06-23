-- Phase 23: Fees module refactoring (versioning, installments, receipts, late-fee policies, indexes)
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS fee_structure_versions (
  id SERIAL PRIMARY KEY,
  fee_structure_id INTEGER NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  frequency VARCHAR(20) NOT NULL,
  late_fee_percentage DECIMAL(5, 2) DEFAULT 0,
  late_fee_days INTEGER DEFAULT 7,
  late_fee_fixed_amount DECIMAL(10, 2) DEFAULT 0,
  late_fee_per_day DECIMAL(10, 2) DEFAULT 0,
  late_fee_max_cap DECIMAL(10, 2),
  metadata JSONB DEFAULT '{}',
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fee_structure_id, version_number)
);

ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS current_version_id INTEGER;
ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS fee_structure_version_id INTEGER;

CREATE TABLE IF NOT EXISTS fee_installment_plans (
  id SERIAL PRIMARY KEY,
  fee_structure_id INTEGER NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
  installment_count INTEGER NOT NULL CHECK (installment_count >= 1),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fee_structure_id)
);

CREATE TABLE IF NOT EXISTS fee_installments (
  id SERIAL PRIMARY KEY,
  student_fee_id INTEGER NOT NULL REFERENCES student_fees(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number >= 1),
  amount_due DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_fee_id, installment_number)
);

CREATE TABLE IF NOT EXISTS fee_receipt_sequences (
  id SERIAL PRIMARY KEY,
  academic_year VARCHAR(20) NOT NULL UNIQUE,
  last_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fee_late_fee_policies (
  id SERIAL PRIMARY KEY,
  fee_structure_id INTEGER REFERENCES fee_structures(id) ON DELETE CASCADE,
  fee_type_pattern VARCHAR(100),
  rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('percentage', 'fixed', 'per_day', 'hybrid')),
  percentage DECIMAL(5, 2) DEFAULT 0,
  fixed_amount DECIMAL(10, 2) DEFAULT 0,
  per_day_amount DECIMAL(10, 2) DEFAULT 0,
  max_cap DECIMAL(10, 2),
  grace_days INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_fees_student_academic_year
  ON student_fees(student_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_student_fees_structure_academic
  ON student_fees(fee_structure_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_fee_payments_academic_year
  ON fee_payments(academic_year);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_date
  ON fee_payments(student_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_fees_status_academic
  ON student_fees(academic_year, status);

ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS fee_breakdown JSONB;

-- Backfill hint: existing payments without fee_breakdown use receipt API inference.

-- Backfill version 1 for existing fee structures without a version
INSERT INTO fee_structure_versions (
  fee_structure_id, version_number, amount, frequency,
  late_fee_percentage, late_fee_days
)
SELECT fs.id, 1, fs.amount, fs.frequency, fs.late_fee_percentage, fs.late_fee_days
FROM fee_structures fs
WHERE NOT EXISTS (
  SELECT 1 FROM fee_structure_versions v WHERE v.fee_structure_id = fs.id
);

UPDATE fee_structures fs
SET current_version_id = v.id
FROM fee_structure_versions v
WHERE v.fee_structure_id = fs.id
  AND v.version_number = 1
  AND fs.current_version_id IS NULL;
