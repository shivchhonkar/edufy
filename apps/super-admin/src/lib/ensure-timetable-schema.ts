type Db = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

const DEFAULT_TIMETABLE_PERIODS = [
  { name: 'Period 1', start_time: '08:00', end_time: '08:40', sort_order: 1 },
  { name: 'Period 2', start_time: '08:40', end_time: '09:20', sort_order: 2 },
  { name: 'Period 3', start_time: '09:20', end_time: '10:00', sort_order: 3 },
  { name: 'Period 4', start_time: '10:00', end_time: '10:40', sort_order: 4 },
  { name: 'Period 5', start_time: '10:40', end_time: '11:20', sort_order: 5 },
  { name: 'Period 6', start_time: '11:20', end_time: '12:00', sort_order: 6 },
  { name: 'Period 7', start_time: '12:00', end_time: '12:40', sort_order: 7 },
  { name: 'Period 8', start_time: '12:40', end_time: '13:20', sort_order: 8 },
  { name: 'Period 9', start_time: '13:20', end_time: '14:00', sort_order: 9 },
] as const;

export async function seedDefaultTimetablePeriods(db: Db) {
  const countResult = await db.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM timetable_periods',
  );
  if (parseInt(countResult.rows[0]?.count || '0', 10) > 0) return;

  for (const period of DEFAULT_TIMETABLE_PERIODS) {
    await db.query(
      `INSERT INTO timetable_periods (name, start_time, end_time, sort_order, is_active)
       VALUES ($1, $2, $3, $4, true)`,
      [period.name, period.start_time, period.end_time, period.sort_order],
    );
  }
}

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

  await seedDefaultTimetablePeriods(db);
}
