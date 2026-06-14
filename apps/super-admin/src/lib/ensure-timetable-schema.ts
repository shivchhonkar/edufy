type Db = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

export async function ensureTimetableSchema(db: Db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS timetable_periods (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      start_time TIME,
      end_time TIME,
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS class_timetable (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      section_id INTEGER REFERENCES sections(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      period_id INTEGER NOT NULL REFERENCES timetable_periods(id) ON DELETE CASCADE,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
      room VARCHAR(50),
      academic_year VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (class_id, section_id, day_of_week, period_id, academic_year)
    );
  `);
}
