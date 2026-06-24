-- Student profile messaging settings and scheduled SMS (2factor.in)

CREATE TABLE IF NOT EXISTS student_messaging_settings (
    student_id INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    automation_enabled BOOLEAN DEFAULT TRUE,
    exclude_fee_reminders BOOLEAN DEFAULT FALSE,
    exclude_attendance_alerts BOOLEAN DEFAULT FALSE,
    exclude_homework_reminders BOOLEAN DEFAULT FALSE,
    exclude_exam_results BOOLEAN DEFAULT FALSE,
    exclude_promotional BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_scheduled_messages (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sms_type VARCHAR(20) DEFAULT 'transactional'
        CHECK (sms_type IN ('transactional', 'promotional')),
    recipient_target VARCHAR(30) DEFAULT 'all',
    scheduled_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    campaign_id INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_scheduled_messages_student
    ON student_scheduled_messages (student_id, scheduled_at DESC);

ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES students(id) ON DELETE SET NULL;
ALTER TABLE sms_campaigns ADD COLUMN IF NOT EXISTS message_category VARCHAR(50) DEFAULT 'manual';

ALTER TABLE sms_message_logs ADD COLUMN IF NOT EXISTS message_type VARCHAR(50);
ALTER TABLE sms_message_logs ADD COLUMN IF NOT EXISTS recipient_label VARCHAR(100);
ALTER TABLE sms_message_logs ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'sent';

CREATE INDEX IF NOT EXISTS idx_sms_message_logs_student_id ON sms_message_logs (student_id);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_student_id ON sms_campaigns (student_id);
