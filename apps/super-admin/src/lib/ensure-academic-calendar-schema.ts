import type { RequestDb } from '@/lib/request-db';
import { ensureSchoolEventsSchema } from '@/lib/ensure-school-events-schema';

export async function ensureAcademicCalendarSchema(db: RequestDb): Promise<void> {
  await ensureSchoolEventsSchema(db);

  await db.query(`
    CREATE TABLE IF NOT EXISTS academic_term_dates (
      id SERIAL PRIMARY KEY,
      academic_year VARCHAR(20) NOT NULL,
      term_name VARCHAR(120) NOT NULL,
      term_number SMALLINT,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CHECK (end_date >= start_date)
    );

    CREATE INDEX IF NOT EXISTS idx_academic_term_dates_year ON academic_term_dates(academic_year);
    CREATE INDEX IF NOT EXISTS idx_academic_term_dates_start ON academic_term_dates(start_date);
  `);

  await db.query(`
    DO $$
    BEGIN
      ALTER TABLE school_events DROP CONSTRAINT IF EXISTS school_events_event_type_check;
      ALTER TABLE school_events ADD CONSTRAINT school_events_event_type_check
        CHECK (event_type IN ('event', 'exam', 'meeting', 'ptm', 'sports', 'other'));
    EXCEPTION
      WHEN undefined_table THEN NULL;
    END $$;
  `);
}
