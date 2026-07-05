type Db = { query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }> };

const RECOMMENDED_PERIODS = [
  { name: 'P1', start_time: '08:00', end_time: '08:40', sort_order: 1, slot_type: 'period', is_schedulable: true, period_category: 'study' },
  { name: 'P2', start_time: '08:40', end_time: '09:20', sort_order: 2, slot_type: 'period', is_schedulable: true, period_category: 'study' },
  { name: 'P3', start_time: '09:20', end_time: '10:00', sort_order: 3, slot_type: 'period', is_schedulable: true, period_category: 'study' },
  { name: 'Break', start_time: '10:00', end_time: '10:20', sort_order: 4, slot_type: 'break', is_schedulable: false, period_category: 'lunch' },
  { name: 'P4', start_time: '10:20', end_time: '11:00', sort_order: 5, slot_type: 'period', is_schedulable: true, period_category: 'study' },
  { name: 'P5', start_time: '11:00', end_time: '11:40', sort_order: 6, slot_type: 'period', is_schedulable: true, period_category: 'study' },
  { name: 'Lunch', start_time: '11:40', end_time: '12:10', sort_order: 7, slot_type: 'lunch', is_schedulable: false, period_category: 'lunch' },
  { name: 'P6', start_time: '12:10', end_time: '12:50', sort_order: 8, slot_type: 'period', is_schedulable: true, period_category: 'study' },
  { name: 'P7', start_time: '12:50', end_time: '13:30', sort_order: 9, slot_type: 'period', is_schedulable: true, period_category: 'study' },
  { name: 'P8', start_time: '13:30', end_time: '14:10', sort_order: 10, slot_type: 'period', is_schedulable: true, period_category: 'study' },
] as const;

const DEFAULT_WORKING_DAYS = [
  { day_of_week: 1, day_name: 'Monday', is_working: true, teaching_period_count: 8 },
  { day_of_week: 2, day_name: 'Tuesday', is_working: true, teaching_period_count: 8 },
  { day_of_week: 3, day_name: 'Wednesday', is_working: true, teaching_period_count: 8 },
  { day_of_week: 4, day_name: 'Thursday', is_working: true, teaching_period_count: 8 },
  { day_of_week: 5, day_name: 'Friday', is_working: true, teaching_period_count: 8 },
  { day_of_week: 6, day_name: 'Saturday', is_working: true, teaching_period_count: 4 },
  { day_of_week: 0, day_name: 'Sunday', is_working: false, teaching_period_count: 0 },
] as const;

async function ensureColumn(
  db: Db,
  table: string,
  column: string,
  definition: string,
) {
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = '${table}' AND column_name = '${column}'
      ) THEN
        ALTER TABLE ${table} ADD COLUMN ${column} ${definition};
      END IF;
    END $$;
  `);
}

export async function seedDefaultTimetablePeriods(db: Db) {
  const countResult = await db.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM timetable_periods',
  );
  if (parseInt(countResult.rows[0]?.count || '0', 10) > 0) return;

  for (const period of RECOMMENDED_PERIODS) {
    await db.query(
      `INSERT INTO timetable_periods (name, start_time, end_time, sort_order, is_active, slot_type, is_schedulable, period_category)
       VALUES ($1, $2, $3, $4, true, $5, $6, $7)`,
      [
        period.name,
        period.start_time,
        period.end_time,
        period.sort_order,
        period.slot_type,
        period.is_schedulable,
        period.period_category,
      ],
    );
  }
}

export async function seedDefaultWorkingDays(db: Db) {
  const countResult = await db.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM school_working_days',
  );
  if (parseInt(countResult.rows[0]?.count || '0', 10) > 0) return;

  for (const day of DEFAULT_WORKING_DAYS) {
    await db.query(
      `INSERT INTO school_working_days (day_of_week, day_name, is_working, teaching_period_count)
       VALUES ($1, $2, $3, $4)`,
      [day.day_of_week, day.day_name, day.is_working, day.teaching_period_count],
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

    CREATE TABLE IF NOT EXISTS school_working_days (
      day_of_week INTEGER PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
      day_name VARCHAR(20) NOT NULL,
      is_working BOOLEAN DEFAULT TRUE,
      teaching_period_count INTEGER DEFAULT 8
    );

    CREATE TABLE IF NOT EXISTS class_subject_period_requirements (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      weekly_periods INTEGER NOT NULL DEFAULT 0 CHECK (weekly_periods >= 0),
      preferred_room VARCHAR(100),
      UNIQUE(class_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS teacher_period_availability (
      id SERIAL PRIMARY KEY,
      staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      period_id INTEGER NOT NULL REFERENCES timetable_periods(id) ON DELETE CASCADE,
      is_available BOOLEAN DEFAULT TRUE,
      UNIQUE(staff_id, day_of_week, period_id)
    );

    CREATE TABLE IF NOT EXISTS subject_room_defaults (
      subject_id INTEGER PRIMARY KEY REFERENCES subjects(id) ON DELETE CASCADE,
      room_name VARCHAR(100) NOT NULL
    );
  `);

  await ensureColumn(db, 'timetable_periods', 'slot_type', "VARCHAR(20) DEFAULT 'period'");
  await ensureColumn(db, 'timetable_periods', 'is_schedulable', 'BOOLEAN DEFAULT TRUE');
  await ensureColumn(db, 'timetable_periods', 'period_category', "VARCHAR(20) DEFAULT 'study'");

  await db.query(`
    UPDATE timetable_periods
    SET period_category = 'lunch'
    WHERE COALESCE(period_category, 'study') = 'study'
      AND (slot_type IN ('lunch', 'break') OR COALESCE(is_schedulable, true) = false)
  `);
  await db.query(`
    UPDATE timetable_periods
    SET period_category = 'study'
    WHERE period_category IS NULL
  `);

  await seedDefaultTimetablePeriods(db);
  await seedDefaultWorkingDays(db);
}

export { RECOMMENDED_PERIODS, DEFAULT_WORKING_DAYS };
