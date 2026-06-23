import type { RequestDb } from '@/lib/request-db';

/**
 * Ensures fee tables/columns exist on tenant DBs (base schema is minimal).
 * Also fixes per-class uniqueness on fee_structures.
 */
export async function ensureFeeSchema(db: RequestDb) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS fee_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO fee_categories (name, description) VALUES
      ('Tuition Fee', 'Regular tuition fees for academic instruction'),
      ('Transport Fee', 'Bus or van transportation charges'),
      ('Registration Fee', 'New student registration and admission charges'),
      ('Library Fee', 'Library maintenance and book lending charges'),
      ('Laboratory Fee', 'Science lab and computer lab charges'),
      ('Sports Fee', 'Sports facilities and equipment charges'),
      ('Examination Fee', 'Exam paper and evaluation charges'),
      ('Activity Fee', 'Extra-curricular activities charges'),
      ('Late Fee', 'Penalty for late payment'),
      ('Other Charges', 'Miscellaneous charges')
    ON CONFLICT (name) DO NOTHING;

    CREATE TABLE IF NOT EXISTS student_fees (
      id SERIAL PRIMARY KEY,
      student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      fee_structure_id INTEGER REFERENCES fee_structures(id),
      academic_year VARCHAR(20) NOT NULL,
      amount_due DECIMAL(10, 2) NOT NULL,
      amount_paid DECIMAL(10, 2) DEFAULT 0,
      discount_amount DECIMAL(10, 2) DEFAULT 0,
      late_fee_amount DECIMAL(10, 2) DEFAULT 0,
      due_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      month INTEGER CHECK (month BETWEEN 1 AND 12),
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, fee_structure_id, academic_year, month)
    );

    ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;
    ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS late_fee_amount DECIMAL(10, 2) DEFAULT 0;
    ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
    ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS month INTEGER;
    ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS remarks TEXT;
    ALTER TABLE student_fees ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES fee_categories(id);
    ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
    ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS late_fee_percentage DECIMAL(5, 2) DEFAULT 0;
    ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS late_fee_days INTEGER DEFAULT 7;
    ALTER TABLE fee_structures ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS student_fee_id INTEGER;
    ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS discount_applied DECIMAL(10, 2) DEFAULT 0;
    ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS late_fee_charged DECIMAL(10, 2) DEFAULT 0;
    ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS month INTEGER;
    ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);
    ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    UPDATE fee_structures SET is_active = true WHERE is_active IS NULL;
    UPDATE fee_structures SET late_fee_percentage = 0 WHERE late_fee_percentage IS NULL;
    UPDATE fee_structures SET late_fee_days = 7 WHERE late_fee_days IS NULL;
    UPDATE student_fees SET late_fee_amount = 0 WHERE late_fee_amount IS NULL;
    UPDATE student_fees SET amount_paid = 0 WHERE amount_paid IS NULL;

    CREATE INDEX IF NOT EXISTS idx_student_fees_student ON student_fees(student_id);
    CREATE INDEX IF NOT EXISTS idx_student_fees_status ON student_fees(status);
    CREATE INDEX IF NOT EXISTS idx_student_fees_due_date ON student_fees(due_date);
    CREATE INDEX IF NOT EXISTS idx_fee_structures_category ON fee_structures(category_id);
  `);

  await db.query(`
    DROP INDEX IF EXISTS unique_active_fee_structure;

    CREATE UNIQUE INDEX IF NOT EXISTS unique_active_fee_structure_per_class
    ON fee_structures (fee_type, COALESCE(class_id, 0), academic_year, frequency)
    WHERE is_active = true;

    CREATE OR REPLACE FUNCTION prevent_duplicate_active_fee_structures()
    RETURNS TRIGGER AS $func$
    BEGIN
      IF NEW.is_active = true THEN
        IF EXISTS (
          SELECT 1 FROM fee_structures
          WHERE fee_type = NEW.fee_type
            AND COALESCE(class_id, 0) = COALESCE(NEW.class_id, 0)
            AND academic_year = NEW.academic_year
            AND frequency = NEW.frequency
            AND is_active = true
            AND id != COALESCE(NEW.id, 0)
        ) THEN
          RAISE EXCEPTION 'Duplicate active fee structure: % already exists for this class and academic year %',
            NEW.fee_type, NEW.academic_year;
        END IF;
      END IF;
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_prevent_duplicate_fee_structures ON fee_structures;
    CREATE TRIGGER trigger_prevent_duplicate_fee_structures
      BEFORE INSERT OR UPDATE ON fee_structures
      FOR EACH ROW
      EXECUTE FUNCTION prevent_duplicate_active_fee_structures();
  `);

  const { ensureFeeExtensions } = await import('@/lib/fees/ensure-fee-extensions');
  await ensureFeeExtensions(db);
}
