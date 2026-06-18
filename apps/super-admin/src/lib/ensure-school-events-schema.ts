import type { RequestDb } from '@/lib/request-db';

export async function ensureSchoolEventsSchema(db: RequestDb): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS school_events (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      event_type VARCHAR(30) NOT NULL DEFAULT 'event'
        CHECK (event_type IN ('event', 'exam', 'meeting', 'sports', 'other')),
      start_date DATE NOT NULL,
      end_date DATE,
      all_day BOOLEAN NOT NULL DEFAULT true,
      start_time TIME,
      end_time TIME,
      location VARCHAR(255),
      audience VARCHAR(30) NOT NULL DEFAULT 'parents'
        CHECK (audience IN ('all', 'parents', 'students', 'staff')),
      status VARCHAR(20) NOT NULL DEFAULT 'published'
        CHECK (status IN ('draft', 'published', 'cancelled')),
      created_by INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_school_events_start_date ON school_events(start_date);
    CREATE INDEX IF NOT EXISTS idx_school_events_audience_status ON school_events(audience, status);
  `);
}
