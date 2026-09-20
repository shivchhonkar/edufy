ALTER TABLE holidays ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50);
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'school';
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS class_id INTEGER;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE holidays ADD COLUMN IF NOT EXISTS remark TEXT;

ALTER TABLE holidays DROP CONSTRAINT IF EXISTS holidays_date_key;

UPDATE holidays SET start_date = date WHERE start_date IS NULL AND date IS NOT NULL;
UPDATE holidays SET end_date = COALESCE(end_date, start_date, date) WHERE end_date IS NULL;
UPDATE holidays SET remark = description WHERE remark IS NULL AND description IS NOT NULL;
UPDATE holidays SET scope = 'school' WHERE scope IS NULL OR TRIM(scope) = '';
