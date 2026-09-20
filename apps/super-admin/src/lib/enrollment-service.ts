import type { RequestDb } from '@/lib/request-db';
import type { StudentEnrollmentStatus } from '@/shared/types';
import { ensureSystemSettings, resolveAcademicYear } from '@/lib/ensure-system-settings';
import {
  backfillEnrollmentAcademicYearIds,
  backfillEnrollmentIdsOnChildTables,
  ensureEnrollmentSchema,
} from '@/lib/ensure-enrollment-schema';

export type { StudentEnrollmentStatus };

export interface StudentEnrollment {
  id: number;
  student_id: number;
  academic_year_id: number | null;
  academic_year: string;
  class_id: number | null;
  section_id: number | null;
  roll_number: string | null;
  stream_id: number | null;
  house_id: number | null;
  status: StudentEnrollmentStatus;
  is_current: boolean;
}

export interface CreateEnrollmentInput {
  studentId: number;
  classId: number | null;
  sectionId?: number | null;
  rollNumber?: string | null;
  academicYearId?: number | null;
  academicYear?: string | null;
  streamId?: number | null;
  houseId?: number | null;
  status?: StudentEnrollmentStatus;
  isCurrent?: boolean;
}

export interface ResolveEnrollmentOptions {
  academicYear?: string | null;
  academicYearId?: number | null;
  enrollmentId?: number | null;
  /** ISO date — picks enrollment whose academic year contains this date */
  asOfDate?: string | null;
}

export interface EnrollmentWriteContext {
  enrollmentId: number;
  studentId: number;
  academicYear: string;
  academicYearId: number | null;
}

/** Ensure enrollment tables/columns exist and backfill links. */
export async function prepareEnrollmentSchema(db: RequestDb): Promise<void> {
  await ensureSystemSettings(db);
  await ensureEnrollmentSchema(db);
}

/** Active enrollment for a student (is_current = true). */
export async function getCurrentEnrollment(
  db: RequestDb,
  studentId: number
): Promise<StudentEnrollment | null> {
  await prepareEnrollmentSchema(db);
  const result = await db.query<StudentEnrollment>(
    `SELECT id, student_id, academic_year_id, academic_year, class_id, section_id,
            roll_number, stream_id, house_id, status, is_current
     FROM student_enrollments
     WHERE student_id = $1 AND is_current = true
     ORDER BY id DESC
     LIMIT 1`,
    [studentId]
  );
  return result.rows[0] ?? null;
}

/** Resolve enrollment by id, academic year, or current. */
export async function resolveEnrollment(
  db: RequestDb,
  studentId: number,
  options: ResolveEnrollmentOptions = {}
): Promise<StudentEnrollment | null> {
  await prepareEnrollmentSchema(db);

  if (options.enrollmentId != null) {
    const byId = await db.query<StudentEnrollment>(
      `SELECT id, student_id, academic_year_id, academic_year, class_id, section_id,
              roll_number, stream_id, house_id, status, is_current
       FROM student_enrollments
       WHERE id = $1 AND student_id = $2`,
      [options.enrollmentId, studentId]
    );
    return byId.rows[0] ?? null;
  }

  if (options.asOfDate) {
    return resolveEnrollmentForDate(db, studentId, options.asOfDate);
  }

  const yearId = options.academicYearId ?? null;
  const yearName =
    options.academicYear ??
    (yearId == null ? await resolveAcademicYear(db, null) : null);

  if (yearId != null) {
    const byYearId = await db.query<StudentEnrollment>(
      `SELECT id, student_id, academic_year_id, academic_year, class_id, section_id,
              roll_number, stream_id, house_id, status, is_current
       FROM student_enrollments
       WHERE student_id = $1 AND academic_year_id = $2
       ORDER BY is_current DESC, id DESC
       LIMIT 1`,
      [studentId, yearId]
    );
    if (byYearId.rows[0]) return byYearId.rows[0];
  }

  if (yearName) {
    const byName = await db.query<StudentEnrollment>(
      `SELECT id, student_id, academic_year_id, academic_year, class_id, section_id,
              roll_number, stream_id, house_id, status, is_current
       FROM student_enrollments
       WHERE student_id = $1 AND academic_year = $2
       ORDER BY is_current DESC, id DESC
       LIMIT 1`,
      [studentId, yearName]
    );
    if (byName.rows[0]) return byName.rows[0];
  }

  return getCurrentEnrollment(db, studentId);
}

/** Pick enrollment whose academic year date range contains the given date. */
export async function resolveEnrollmentForDate(
  db: RequestDb,
  studentId: number,
  date: string
): Promise<StudentEnrollment | null> {
  await prepareEnrollmentSchema(db);
  const result = await db.query<StudentEnrollment>(
    `SELECT e.id, e.student_id, e.academic_year_id, e.academic_year, e.class_id, e.section_id,
            e.roll_number, e.stream_id, e.house_id, e.status, e.is_current
     FROM student_enrollments e
     LEFT JOIN academic_years ay ON ay.id = e.academic_year_id
     WHERE e.student_id = $1
       AND (
         (ay.start_date IS NOT NULL AND ay.end_date IS NOT NULL AND $2::date BETWEEN ay.start_date AND ay.end_date)
         OR (ay.id IS NULL AND e.is_current = true)
       )
     ORDER BY
       CASE WHEN ay.start_date IS NOT NULL AND $2::date BETWEEN ay.start_date AND ay.end_date THEN 0 ELSE 1 END,
       e.is_current DESC,
       e.id DESC
     LIMIT 1`,
    [studentId, date]
  );
  if (result.rows[0]) return result.rows[0];
  return getCurrentEnrollment(db, studentId);
}

/** Resolve academic year id + name for new enrollments. */
export async function resolveAcademicYearRecord(
  db: RequestDb,
  academicYearId?: number | null,
  academicYearName?: string | null
): Promise<{ id: number; name: string }> {
  await ensureSystemSettings(db);

  if (academicYearId != null) {
    const byId = await db.query<{ id: number; name: string }>(
      'SELECT id, name FROM academic_years WHERE id = $1',
      [academicYearId]
    );
    if (byId.rows[0]) return byId.rows[0];
  }

  if (academicYearName) {
    const byName = await db.query<{ id: number; name: string }>(
      'SELECT id, name FROM academic_years WHERE name = $1',
      [academicYearName]
    );
    if (byName.rows[0]) return byName.rows[0];
  }

  const active = await db.query<{ id: number; name: string }>(
    'SELECT id, name FROM academic_years WHERE is_active = true ORDER BY start_date DESC LIMIT 1'
  );
  if (active.rows[0]) return active.rows[0];

  const fallbackName = academicYearName ?? (await resolveAcademicYear(db, null));
  const created = await db.query<{ id: number; name: string }>(
    `INSERT INTO academic_years (name, start_date, end_date, is_active)
     VALUES ($1, $2, $3, true)
     ON CONFLICT (name) DO UPDATE SET updated_at = NOW()
     RETURNING id, name`,
    [
      fallbackName,
      `${new Date().getFullYear()}-04-01`,
      `${new Date().getFullYear() + 1}-03-31`,
    ]
  );
  return created.rows[0];
}

/** Create or replace current enrollment. Does not write students.class_id (enrollment is source of truth). */
export async function createCurrentEnrollment(
  db: RequestDb,
  input: CreateEnrollmentInput
): Promise<number> {
  await prepareEnrollmentSchema(db);

  const year = await resolveAcademicYearRecord(
    db,
    input.academicYearId,
    input.academicYear
  );

  await db.query(
    `UPDATE student_enrollments
     SET is_current = false, updated_at = NOW()
     WHERE student_id = $1 AND is_current = true`,
    [input.studentId]
  );

  const insert = await db.query<{ id: number }>(
    `INSERT INTO student_enrollments (
      student_id, academic_year_id, academic_year, class_id, section_id,
      roll_number, stream_id, house_id, status, is_current
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id`,
    [
      input.studentId,
      year.id,
      year.name,
      input.classId,
      input.sectionId ?? null,
      input.rollNumber ?? null,
      input.streamId ?? null,
      input.houseId ?? null,
      input.status ?? 'active',
      input.isCurrent !== false,
    ]
  );

  return insert.rows[0].id;
}

/** Update placement fields on the current enrollment row. */
export async function updateCurrentEnrollmentPlacement(
  db: RequestDb,
  studentId: number,
  placement: {
    classId?: number | null;
    sectionId?: number | null;
    rollNumber?: string | null;
    streamId?: number | null;
    houseId?: number | null;
  }
): Promise<void> {
  const current = await getCurrentEnrollment(db, studentId);
  if (!current) {
    if (placement.classId == null) return;
    const year = await resolveAcademicYearRecord(db);
    await createCurrentEnrollment(db, {
      studentId,
      classId: placement.classId,
      sectionId: placement.sectionId,
      rollNumber: placement.rollNumber,
      academicYearId: year.id,
      academicYear: year.name,
    });
    return;
  }

  await db.query(
    `UPDATE student_enrollments
     SET class_id = COALESCE($2, class_id),
         section_id = COALESCE($3, section_id),
         roll_number = COALESCE($4, roll_number),
         stream_id = COALESCE($5, stream_id),
         house_id = COALESCE($6, house_id),
         updated_at = NOW()
     WHERE id = $1`,
    [
      current.id,
      placement.classId ?? null,
      placement.sectionId ?? null,
      placement.rollNumber ?? null,
      placement.streamId ?? null,
      placement.houseId ?? null,
    ]
  );
}

/**
 * Optional denormalized cache on students for legacy reads / indexes.
 * Call after enrollment changes when backward compatibility is needed.
 */
export async function syncStudentDenormalizedFromEnrollment(
  db: RequestDb,
  studentId: number
): Promise<void> {
  const current = await getCurrentEnrollment(db, studentId);
  if (!current) {
    await db.query(
      `UPDATE students
       SET class_id = NULL, section_id = NULL, roll_number = NULL, updated_at = NOW()
       WHERE id = $1`,
      [studentId]
    );
    return;
  }

  await db.query(
    `UPDATE students
     SET class_id = $2, section_id = $3, roll_number = $4, updated_at = NOW()
     WHERE id = $1`,
    [studentId, current.class_id, current.section_id, current.roll_number]
  );
}

/** Context for writing session-scoped records (attendance, fees, etc.). */
export async function resolveEnrollmentWriteContext(
  db: RequestDb,
  studentId: number,
  options: ResolveEnrollmentOptions = {}
): Promise<EnrollmentWriteContext | null> {
  const enrollment = await resolveEnrollment(db, studentId, options);
  if (!enrollment) return null;

  return {
    enrollmentId: enrollment.id,
    studentId,
    academicYear: enrollment.academic_year,
    academicYearId: enrollment.academic_year_id,
  };
}

export async function runEnrollmentBackfill(db: RequestDb): Promise<{
  academicYearIds: number;
  childTables: Awaited<ReturnType<typeof backfillEnrollmentIdsOnChildTables>>;
}> {
  await prepareEnrollmentSchema(db);
  const academicYearIds = await backfillEnrollmentAcademicYearIds(db);
  const childTables = await backfillEnrollmentIdsOnChildTables(db);
  return { academicYearIds, childTables };
}

/** List enrollments for a student (history). */
export async function listStudentEnrollments(
  db: RequestDb,
  studentId: number
): Promise<StudentEnrollment[]> {
  await prepareEnrollmentSchema(db);
  const result = await db.query<StudentEnrollment>(
    `SELECT id, student_id, academic_year_id, academic_year, class_id, section_id,
            roll_number, stream_id, house_id, status, is_current
     FROM student_enrollments
     WHERE student_id = $1
     ORDER BY is_current DESC, id DESC`,
    [studentId]
  );
  return result.rows;
}
