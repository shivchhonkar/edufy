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

-- Extend submission status values for teacher review workflow
ALTER TABLE homework_submissions DROP CONSTRAINT IF EXISTS homework_submissions_status_check;
ALTER TABLE homework_submissions ADD CONSTRAINT homework_submissions_status_check
  CHECK (status IN ('pending', 'submitted', 'graded', 'late', 'rejected', 'resubmit_requested'));
