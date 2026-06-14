import type { RequestDb } from '@/lib/request-db';

const COMMUNICATIONS_SQL = `
CREATE TABLE IF NOT EXISTS school_circulars (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  circular_number VARCHAR(50),
  audience_type VARCHAR(50) NOT NULL,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  priority VARCHAR(20) DEFAULT 'normal'
    CHECK (priority IN ('normal', 'important', 'urgent')),
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  effective_date DATE,
  expires_at TIMESTAMP,
  send_sms BOOLEAN DEFAULT FALSE,
  sms_sent_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_school_circulars_status ON school_circulars(status);
CREATE INDEX IF NOT EXISTS idx_school_circulars_published ON school_circulars(published_at DESC);

CREATE TABLE IF NOT EXISTS school_notifications (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  audience_type VARCHAR(50) NOT NULL,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  priority VARCHAR(20) DEFAULT 'info'
    CHECK (priority IN ('info', 'warning', 'urgent')),
  category VARCHAR(50) DEFAULT 'general',
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'expired', 'archived')),
  send_sms BOOLEAN DEFAULT FALSE,
  sms_sent_at TIMESTAMP,
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_school_notifications_status ON school_notifications(status);
CREATE INDEX IF NOT EXISTS idx_school_notifications_published ON school_notifications(published_at DESC);

CREATE TABLE IF NOT EXISTS email_campaigns (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT,
  body_text TEXT NOT NULL,
  audience_type VARCHAR(50) NOT NULL,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft'
    CHECK (status IN ('draft', 'sending', 'completed', 'failed', 'queued')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created ON email_campaigns(created_at DESC);

CREATE TABLE IF NOT EXISTS email_message_logs (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'queued')),
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_message_logs_campaign ON email_message_logs(campaign_id);
`;

export async function ensureCommunicationsSchema(db: RequestDb) {
  await db.query(COMMUNICATIONS_SQL);
}
