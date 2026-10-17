import type { RequestDb } from '@/lib/request-db';

const ENROLLMENT_CHILD_TABLES = [
  'attendance',
  'student_fees',
  'exam_results',
  'student_transport',
  'homework_submissions',
  'fee_payments',
] as const;

/**
 * Idempotent enrollment-centric schema: FK columns, backfill, constraints.
 * Safe to call on every tenant DB before enrollment-aware reads/writes.
 */
export async function ensureEnrollmentSchema(db: RequestDb): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS student_enrollments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      academic_year_id INTEGER,
      academic_year VARCHAR(20) NOT NULL,
      class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
      section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
      roll_number VARCHAR(50),
      stream_id INTEGER,
      house_id INTEGER,
      status VARCHAR(20) DEFAULT 'active',
      is_current BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_student_enrollments_student_id
      ON student_enrollments (student_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_student_enrollments_one_current_per_student
      ON student_enrollments (student_id) WHERE is_current = true;
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_current
      ON student_enrollments (student_id, is_current) WHERE is_current = true;
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_academic_year_id
      ON student_enrollments (academic_year_id);
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_year_name
      ON student_enrollments (academic_year);
  `);

  for (const table of ENROLLMENT_CHILD_TABLES) {
    const exists = await db.query<{ reg: string | null }>(
      `SELECT to_regclass('public.${table}') AS reg`
    );
    if (!exists.rows[0]?.reg) continue;

    await db.query(`
      ALTER TABLE ${table}
      ADD COLUMN IF NOT EXISTS enrollment_id INTEGER REFERENCES student_enrollments(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_${table}_enrollment_id ON ${table}(enrollment_id);
    `);
  }

  // Phase 4 prep: academic_year on child rows becomes optional (sourced from enrollment).
  await db.query(`
    DO $$ BEGIN
      ALTER TABLE student_fees ALTER COLUMN academic_year DROP NOT NULL;
    EXCEPTION WHEN others THEN NULL;
    END $$;

    DO $$ BEGIN
      ALTER TABLE fee_payments ALTER COLUMN academic_year DROP NOT NULL;
    EXCEPTION WHEN others THEN NULL;
    END $$;
  `);

  // Attendance: prefer uniqueness per enrollment + date when enrollment_id is present.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_enrollment_date
      ON attendance (enrollment_id, date)
      WHERE enrollment_id IS NOT NULL;
  `);

  const attendanceTable = await db.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'attendance'
    ) AS exists
  `);
  if (attendanceTable.rows[0]?.exists) {
    await db.query(`
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_in_time TIME;
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out_time TIME;
    `);
  }

  await backfillEnrollmentAcademicYearIds(db);
  await backfillEnrollmentIdsOnChildTables(db);
}

/** Link enrollments missing academic_year_id to academic_years rows. */
export async function backfillEnrollmentAcademicYearIds(db: RequestDb): Promise<number> {
  const byName = await db.query(
    `UPDATE student_enrollments e
     SET academic_year_id = ay.id, updated_at = NOW()
     FROM academic_years ay
     WHERE e.academic_year_id IS NULL
       AND LOWER(TRIM(e.academic_year)) = LOWER(TRIM(ay.name))`
  );

  const activeFallback = await db.query(
    `UPDATE student_enrollments e
     SET academic_year_id = ay.id,
         academic_year = ay.name,
         updated_at = NOW()
     FROM academic_years ay
     WHERE e.academic_year_id IS NULL
       AND ay.is_active = true
       AND e.id IN (
         SELECT id FROM student_enrollments WHERE academic_year_id IS NULL LIMIT 500
       )`
  );

  return (byName.rowCount ?? 0) + (activeFallback.rowCount ?? 0);
}

/** Backfill enrollment_id on operational tables from student_id + academic year / date. */
export async function backfillEnrollmentIdsOnChildTables(db: RequestDb): Promise<{
  attendance: number;
  student_fees: number;
  exam_results: number;
  student_transport: number;
  homework_submissions: number;
  fee_payments: number;
}> {
  const stats = {
    attendance: 0,
    student_fees: 0,
    exam_results: 0,
    student_transport: 0,
    homework_submissions: 0,
    fee_payments: 0,
  };

  const attendance = await db.query(
    `UPDATE attendance a
     SET enrollment_id = sub.enrollment_id
     FROM (
       SELECT a2.id AS attendance_id,
         (
           SELECT e.id FROM student_enrollments e
           LEFT JOIN academic_years ay ON ay.id = e.academic_year_id
           WHERE e.student_id = a2.student_id
             AND (
               (ay.start_date IS NOT NULL AND ay.end_date IS NOT NULL
                AND a2.date BETWEEN ay.start_date AND ay.end_date)
               OR e.is_current = true
             )
           ORDER BY
             CASE WHEN ay.start_date IS NOT NULL AND ay.end_date IS NOT NULL
                  AND a2.date BETWEEN ay.start_date AND ay.end_date THEN 0 ELSE 1 END,
             e.is_current DESC,
             e.id DESC
           LIMIT 1
         ) AS enrollment_id
       FROM attendance a2
       WHERE a2.enrollment_id IS NULL
     ) sub
     WHERE a.id = sub.attendance_id AND sub.enrollment_id IS NOT NULL`
  );
  stats.attendance = attendance.rowCount ?? 0;

  const studentFees2 = await db.query(
    `UPDATE student_fees sf
     SET enrollment_id = (
       SELECT e.id FROM student_enrollments e
       WHERE e.student_id = sf.student_id AND e.academic_year = sf.academic_year
       ORDER BY e.is_current DESC, e.id DESC LIMIT 1
     )
     WHERE sf.enrollment_id IS NULL AND sf.academic_year IS NOT NULL`
  );
  stats.student_fees = studentFees2.rowCount ?? 0;

  const examResults = await db.query(
    `UPDATE exam_results er
     SET enrollment_id = (
       SELECT e.id FROM student_enrollments e
       INNER JOIN exams ex ON ex.id = er.exam_id
       WHERE e.student_id = er.student_id AND e.academic_year = ex.academic_year
       ORDER BY e.is_current DESC, e.id DESC LIMIT 1
     )
     WHERE er.enrollment_id IS NULL`
  );
  stats.exam_results = examResults.rowCount ?? 0;

  const transport = await db.query(
    `UPDATE student_transport st
     SET enrollment_id = (
       SELECT e.id FROM student_enrollments e
       LEFT JOIN academic_years ay ON ay.id = e.academic_year_id
       WHERE e.student_id = st.student_id
         AND (
           (ay.start_date IS NOT NULL AND st.start_date BETWEEN ay.start_date AND COALESCE(ay.end_date, ay.start_date + INTERVAL '400 days'))
           OR e.is_current = true
         )
       ORDER BY
         CASE WHEN ay.start_date IS NOT NULL AND st.start_date >= ay.start_date THEN 0 ELSE 1 END,
         e.is_current DESC,
         e.id DESC
       LIMIT 1
     )
     WHERE st.enrollment_id IS NULL`
  );
  stats.student_transport = transport.rowCount ?? 0;

  const homework = await db.query(
    `UPDATE homework_submissions hs
     SET enrollment_id = (
       SELECT e.id FROM student_enrollments e
       WHERE e.student_id = hs.student_id AND e.is_current = true
       ORDER BY e.id DESC LIMIT 1
     )
     WHERE hs.enrollment_id IS NULL`
  );
  stats.homework_submissions = homework.rowCount ?? 0;

  const payments = await db.query(
    `UPDATE fee_payments fp
     SET enrollment_id = (
       SELECT sf.enrollment_id FROM student_fees sf
       WHERE sf.id = fp.student_fee_id AND sf.enrollment_id IS NOT NULL
       LIMIT 1
     )
     WHERE fp.enrollment_id IS NULL AND fp.student_fee_id IS NOT NULL`
  );
  stats.fee_payments = payments.rowCount ?? 0;

  const payments2 = await db.query(
    `UPDATE fee_payments fp
     SET enrollment_id = (
       SELECT e.id FROM student_enrollments e
       WHERE e.student_id = fp.student_id
         AND (fp.academic_year IS NULL OR e.academic_year = fp.academic_year)
       ORDER BY e.is_current DESC, e.id DESC LIMIT 1
     )
     WHERE fp.enrollment_id IS NULL AND fp.student_id IS NOT NULL`
  );
  stats.fee_payments += payments2.rowCount ?? 0;

  return stats;
}
