-- Student Parent Portal login passwords
ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_password_hash VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_password_set_at TIMESTAMP;
