-- Homework enhancements for parent portal (safe to run multiple times)
ALTER TABLE homework ADD COLUMN IF NOT EXISTS attachments JSONB;
ALTER TABLE homework ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE homework ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS submission_text TEXT;
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS submission_file TEXT;
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP;
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP;
ALTER TABLE homework_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
