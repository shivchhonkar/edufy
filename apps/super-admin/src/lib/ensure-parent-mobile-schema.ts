import type { RequestDb } from '@/lib/request-db'

export async function ensureParentMobileSchema(db: RequestDb): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS parent_consent_forms (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      class_id INTEGER,
      section_id INTEGER,
      due_date DATE,
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS parent_consent_responses (
      id SERIAL PRIMARY KEY,
      form_id INTEGER NOT NULL REFERENCES parent_consent_forms(id) ON DELETE CASCADE,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      decision VARCHAR(20) NOT NULL,
      note TEXT,
      responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (form_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS parent_feedback (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      category VARCHAR(40) NOT NULL DEFAULT 'general',
      subject VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `)
}
