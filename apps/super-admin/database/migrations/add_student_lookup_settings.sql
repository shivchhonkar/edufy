ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS student_lookup_settings JSONB DEFAULT '{}'::jsonb;
