import type { RequestDb } from '@/lib/request-db';

/**
 * Fee operations schema: receipt series, category/student-wise rates,
 * opening balances, reminder logs, refunds, and reversals.
 */
export async function ensureFeeOperationsSchema(db: RequestDb) {
  await db.query(`
    ALTER TABLE fee_receipt_sequences ADD COLUMN IF NOT EXISTS name VARCHAR(100);
    ALTER TABLE fee_receipt_sequences ADD COLUMN IF NOT EXISTS prefix VARCHAR(20) DEFAULT 'RCP';
    ALTER TABLE fee_receipt_sequences ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
    ALTER TABLE fee_receipt_sequences ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

    UPDATE fee_receipt_sequences
    SET prefix = COALESCE(NULLIF(BTRIM(prefix), ''), 'RCP')
    WHERE prefix IS NULL OR BTRIM(prefix) = '';

    UPDATE fee_receipt_sequences
    SET name = COALESCE(NULLIF(BTRIM(name), ''), 'Default Series')
    WHERE name IS NULL OR BTRIM(name) = '';

    UPDATE fee_receipt_sequences s
    SET is_default = true
    WHERE s.id IN (
      SELECT DISTINCT ON (academic_year) id
      FROM fee_receipt_sequences
      ORDER BY academic_year, id
    )
    AND NOT EXISTS (
      SELECT 1 FROM fee_receipt_sequences other
      WHERE other.academic_year = s.academic_year AND other.is_default = true
    );

    ALTER TABLE fee_receipt_sequences ALTER COLUMN prefix SET DEFAULT 'RCP';
    ALTER TABLE fee_receipt_sequences ALTER COLUMN prefix SET NOT NULL;

    CREATE TABLE IF NOT EXISTS fee_category_rates (
      id SERIAL PRIMARY KEY,
      academic_year VARCHAR(20) NOT NULL,
      class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
      fee_type VARCHAR(100) NOT NULL,
      student_category VARCHAR(50) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
      frequency VARCHAR(20) DEFAULT 'monthly',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (academic_year, class_id, fee_type, student_category)
    );

    CREATE TABLE IF NOT EXISTS fee_student_overrides (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      student_fee_id INTEGER REFERENCES student_fees(id) ON DELETE SET NULL,
      academic_year VARCHAR(20) NOT NULL,
      fee_type VARCHAR(100) NOT NULL,
      month INTEGER,
      amount DECIMAL(10, 2) NOT NULL,
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fee_opening_balances (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      academic_year VARCHAR(20) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      remarks TEXT,
      student_fee_id INTEGER REFERENCES student_fees(id) ON DELETE SET NULL,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (student_id, academic_year)
    );

    CREATE TABLE IF NOT EXISTS fee_reminder_logs (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      academic_year VARCHAR(20),
      channels TEXT[] NOT NULL DEFAULT '{}',
      message TEXT NOT NULL,
      amount_due DECIMAL(10, 2) DEFAULT 0,
      sent_by INTEGER,
      sent_by_name VARCHAR(150),
      sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fee_refunds (
      id SERIAL PRIMARY KEY,
      payment_id INTEGER NOT NULL REFERENCES fee_payments(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      amount DECIMAL(10, 2) NOT NULL,
      refund_date DATE NOT NULL,
      method VARCHAR(50) DEFAULT 'cash',
      remarks TEXT,
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fee_reversals (
      id SERIAL PRIMARY KEY,
      payment_id INTEGER NOT NULL REFERENCES fee_payments(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      reason TEXT,
      reversed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INTEGER
    );

    ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS is_misc BOOLEAN DEFAULT false;
    ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS allocated_fee_ids INTEGER[];
    ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMP;
    ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(10, 2) DEFAULT 0;
    ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS payment_source VARCHAR(40) DEFAULT 'counter';

    CREATE INDEX IF NOT EXISTS idx_fee_category_rates_year_class
      ON fee_category_rates(academic_year, class_id);
    CREATE INDEX IF NOT EXISTS idx_fee_student_overrides_student
      ON fee_student_overrides(student_id, academic_year);
    CREATE INDEX IF NOT EXISTS idx_fee_opening_balances_year
      ON fee_opening_balances(academic_year);
    CREATE INDEX IF NOT EXISTS idx_fee_reminder_logs_sent
      ON fee_reminder_logs(sent_at DESC);
    CREATE INDEX IF NOT EXISTS idx_fee_refunds_date
      ON fee_refunds(refund_date DESC);
    CREATE INDEX IF NOT EXISTS idx_fee_payments_misc
      ON fee_payments(is_misc) WHERE is_misc = true;
  `);

  await db.query(`
    DO $$
    DECLARE rec RECORD;
    BEGIN
      FOR rec IN
        SELECT c.conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'fee_receipt_sequences'
          AND c.contype = 'u'
          AND pg_get_constraintdef(c.oid) ILIKE '%academic_year%'
          AND pg_get_constraintdef(c.oid) NOT ILIKE '%prefix%'
      LOOP
        EXECUTE format('ALTER TABLE fee_receipt_sequences DROP CONSTRAINT %I', rec.conname);
      END LOOP;
    END $$;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_fee_receipt_sequences_year_prefix
      ON fee_receipt_sequences (academic_year, prefix);
  `);

  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_status_check;
      ALTER TABLE fee_payments
        ADD CONSTRAINT fee_payments_status_check
        CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'reversed'));
    EXCEPTION WHEN duplicate_object OR check_violation THEN
      NULL;
    END $$;
  `);

  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE fee_payments DROP CONSTRAINT IF EXISTS fee_payments_payment_method_check;
      ALTER TABLE fee_payments
        ADD CONSTRAINT fee_payments_payment_method_check
        CHECK (payment_method IN ('cash', 'online', 'cheque', 'card', 'upi', 'bank'));
    EXCEPTION WHEN duplicate_object OR check_violation THEN
      NULL;
    END $$;
  `);
}
