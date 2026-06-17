-- Phase 13: system_settings + academic_years for tenant DBs (e.g. edulakhya_gla)

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
SELECT 'EduLakhya School', 'INR', 2.00, 7, true, true
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
