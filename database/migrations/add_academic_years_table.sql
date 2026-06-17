-- Create academic_years table
CREATE TABLE IF NOT EXISTS academic_years (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_academic_years_is_active ON academic_years(is_active);
CREATE INDEX IF NOT EXISTS idx_academic_years_start_date ON academic_years(start_date);

-- Insert default academic year (2024-2025) if none exists
INSERT INTO academic_years (name, start_date, end_date, is_active)
SELECT '2024-2025', '2024-04-01', '2025-03-31', true
WHERE NOT EXISTS (SELECT 1 FROM academic_years WHERE is_active = true);

-- Insert current academic year (2025-2026) if it doesn't exist
INSERT INTO academic_years (name, start_date, end_date, is_active)
SELECT '2025-2026', '2025-04-01', '2026-03-31', false
WHERE NOT EXISTS (SELECT 1 FROM academic_years WHERE name = '2025-2026');




