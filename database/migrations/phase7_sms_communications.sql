-- Phase 7: SMS campaigns and message logs (2factor.in integration)

CREATE TABLE IF NOT EXISTS sms_campaigns (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sms_type VARCHAR(20) DEFAULT 'transactional'
        CHECK (sms_type IN ('transactional', 'promotional')),
    audience_type VARCHAR(50) NOT NULL,
    class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed'
        CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sms_message_logs (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES sms_campaigns(id) ON DELETE CASCADE,
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(255),
    student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'failed')),
    provider_response TEXT,
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sms_campaigns_created_at ON sms_campaigns (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_message_logs_campaign_id ON sms_message_logs (campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_message_logs_phone ON sms_message_logs (recipient_phone);
