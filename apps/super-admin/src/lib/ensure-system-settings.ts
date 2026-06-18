import type { RequestDb } from '@/lib/request-db';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  school_name VARCHAR(255),
  school_address TEXT,
  school_phone VARCHAR(20),
  school_email VARCHAR(255),
  academic_year VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'INR',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  late_fee_percentage DECIMAL(5, 2) DEFAULT 2.00,
  late_fee_days INTEGER DEFAULT 7,
  auto_assign_fees BOOLEAN DEFAULT true,
  send_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_settings_academic_year ON system_settings(academic_year);

INSERT INTO system_settings (
  school_name, currency, late_fee_percentage, late_fee_days, auto_assign_fees, send_notifications
)
SELECT 'Shribi Edufy School', 'INR', 2.00, 7, true, true
WHERE NOT EXISTS (SELECT 1 FROM system_settings LIMIT 1);

CREATE TABLE IF NOT EXISTS academic_years (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_academic_years_is_active ON academic_years(is_active);
CREATE INDEX IF NOT EXISTS idx_academic_years_start_date ON academic_years(start_date);

ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS report_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS theme_settings JSONB DEFAULT '{}'::jsonb;
`;

/** Idempotent — creates system_settings + academic_years on tenant DBs. */
export async function ensureSystemSettings(db: RequestDb): Promise<void> {
  await db.query(MIGRATION_SQL);
}

/** Resolve academic year from query param, system_settings, or active academic_years row. */
export async function resolveAcademicYear(
  db: RequestDb,
  fromQuery: string | null
): Promise<string> {
  if (fromQuery) return fromQuery;
  await ensureSystemSettings(db);
  const settingsResult = await db.query(
    'SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1'
  );
  if (settingsResult.rows[0]?.academic_year) {
    return settingsResult.rows[0].academic_year as string;
  }
  const activeYear = await db.query(
    'SELECT name FROM academic_years WHERE is_active = true ORDER BY id DESC LIMIT 1'
  );
  return (activeYear.rows[0]?.name as string) || '2025-26';
}

/** Sync active academic year name into system_settings (creates table/row if needed). */
export async function syncActiveAcademicYear(
  db: RequestDb,
  academicYearName: string
): Promise<void> {
  await ensureSystemSettings(db);
  await db.query(
    `UPDATE system_settings
     SET academic_year = $1, updated_at = NOW()
     WHERE id = (SELECT id FROM system_settings ORDER BY id DESC LIMIT 1)`,
    [academicYearName]
  );
}
