import type { RequestDb } from '@/lib/request-db';
import type { StudentEnrollmentStatus } from '@/shared/types';
import type { QueryResult } from 'pg';
import { ensureClassSectionsTable } from '@/lib/ensure-class-sections';

export type PromotionAction = 'promoted' | 'repeated' | 'transferred';

export interface AcademicYearRow {
  id: number;
  name: string;
  is_active: boolean;
}

export interface CurrentEnrollmentRow {
  id: number;
  student_id: number;
  academic_year_id: number | null;
  academic_year: string;
  class_id: number | null;
  section_id: number | null;
  roll_number: string | null;
  status: StudentEnrollmentStatus;
  is_current: boolean;
}

export interface PromoteStudentInput {
  studentId: number;
  targetClassId: number;
  targetSectionId?: number | null;
  targetAcademicYearId?: number | null;
  targetAcademicYear: string;
  promotionAction: PromotionAction;
  rollNumber?: string | null;
  preserveRollNumber?: boolean;
}

export interface PromoteStudentResult {
  studentId: number;
  success: boolean;
  error?: string;
  enrollmentId?: number;
}

export interface EligibleStudentRow {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  admission_number: string;
  roll_number: string | null;
  class_id: number | null;
  section_id: number | null;
  class_name: string | null;
  section_name: string | null;
  academic_year: string | null;
  enrollment_id: number | null;
}

const PROMOTION_ACTIONS: PromotionAction[] = ['promoted', 'repeated', 'transferred'];

export function isValidPromotionAction(value: string): value is PromotionAction {
  return PROMOTION_ACTIONS.includes(value as PromotionAction);
}

export async function getAcademicYearById(
  db: RequestDb,
  academicYearId: number
): Promise<AcademicYearRow | null> {
  const result = await db.query<AcademicYearRow>(
    'SELECT id, name, is_active FROM academic_years WHERE id = $1',
    [academicYearId]
  );
  return result.rows[0] ?? null;
}

export async function getActiveAcademicYear(db: RequestDb): Promise<AcademicYearRow | null> {
  const result = await db.query<AcademicYearRow>(
    'SELECT id, name, is_active FROM academic_years WHERE is_active = true ORDER BY start_date DESC LIMIT 1'
  );
  return result.rows[0] ?? null;
}

export async function classExists(db: RequestDb, classId: number): Promise<boolean> {
  const result = await db.query<{ id: number }>('SELECT id FROM classes WHERE id = $1', [classId]);
  return result.rows.length > 0;
}

export async function sectionBelongsToClass(
  db: RequestDb,
  sectionId: number,
  classId: number
): Promise<boolean> {
  try {
    await ensureClassSectionsTable(db);
    const result = await db.query<{ id: number }>(
      `SELECT s.id
       FROM sections s
       WHERE s.id = $1
         AND (
           s.class_id = $2
           OR EXISTS (
             SELECT 1 FROM class_sections cs
             WHERE cs.section_id = s.id AND cs.class_id = $2
           )
         )`,
      [sectionId, classId]
    );
    return result.rows.length > 0;
  } catch {
    const legacy = await db.query<{ id: number }>(
      'SELECT id FROM sections WHERE id = $1 AND class_id = $2',
      [sectionId, classId]
    );
    return legacy.rows.length > 0;
  }
}

export async function getCurrentEnrollment(
  db: RequestDb,
  studentId: number
): Promise<CurrentEnrollmentRow | null> {
  const result = await db.query<CurrentEnrollmentRow>(
    `SELECT id, student_id, academic_year_id, academic_year, class_id, section_id,
            roll_number, status, is_current
     FROM student_enrollments
     WHERE student_id = $1 AND is_current = true
     ORDER BY id DESC
     LIMIT 1`,
    [studentId]
  );
  return result.rows[0] ?? null;
}

export async function fetchEligibleStudents(
  db: RequestDb,
  classId: number,
  sectionId?: number | null
): Promise<EligibleStudentRow[]> {
  const params: (number | null)[] = [classId, sectionId ?? null];
  const result = await db.query<EligibleStudentRow>(
    `SELECT
      s.id,
      s.first_name,
      s.middle_name,
      s.last_name,
      s.admission_number,
      COALESCE(e.roll_number, s.roll_number) AS roll_number,
      COALESCE(e.class_id, s.class_id) AS class_id,
      COALESCE(e.section_id, s.section_id) AS section_id,
      c.name AS class_name,
      sec.name AS section_name,
      e.academic_year,
      e.id AS enrollment_id
    FROM students s
    LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
    LEFT JOIN classes c ON COALESCE(e.class_id, s.class_id) = c.id
    LEFT JOIN sections sec ON COALESCE(e.section_id, s.section_id) = sec.id
    WHERE s.status = 'active'
      AND COALESCE(e.class_id, s.class_id) = $1
      AND ($2::int IS NULL OR COALESCE(e.section_id, s.section_id) = $2)
    ORDER BY s.first_name ASC, s.last_name ASC`,
    params
  );
  return result.rows;
}

async function syncStudentClassFields(
  db: RequestDb,
  studentId: number,
  classId: number,
  sectionId: number | null,
  rollNumber: string | null
): Promise<void> {
  await db.query(
    `UPDATE students
     SET class_id = $2, section_id = $3, roll_number = $4, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [studentId, classId, sectionId, rollNumber]
  );
}

export async function promoteStudent(
  db: RequestDb,
  input: PromoteStudentInput
): Promise<PromoteStudentResult> {
  const {
    studentId,
    targetClassId,
    targetSectionId = null,
    targetAcademicYearId = null,
    targetAcademicYear,
    promotionAction,
    rollNumber,
    preserveRollNumber = true,
  } = input;

  const studentCheck = await db.query<{ id: number; roll_number: string | null }>(
    'SELECT id, roll_number FROM students WHERE id = $1 AND status = $2',
    [studentId, 'active']
  );
  if (studentCheck.rows.length === 0) {
    return { studentId, success: false, error: 'Student not found or inactive' };
  }

  const current = await getCurrentEnrollment(db, studentId);
  const resolvedRoll =
    rollNumber !== undefined
      ? rollNumber
      : preserveRollNumber
        ? current?.roll_number ?? studentCheck.rows[0].roll_number
        : null;

  if (current) {
    await db.query(
      `UPDATE student_enrollments
       SET is_current = false,
           status = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [current.id, promotionAction]
    );
  }

  const insertResult = await db.query<{ id: number }>(
    `INSERT INTO student_enrollments (
      student_id, academic_year_id, academic_year, class_id, section_id,
      roll_number, status, is_current
    ) VALUES ($1, $2, $3, $4, $5, $6, 'active', true)
    RETURNING id`,
    [
      studentId,
      targetAcademicYearId,
      targetAcademicYear,
      targetClassId,
      targetSectionId,
      resolvedRoll,
    ]
  );

  await db.query(
    `UPDATE student_enrollments
     SET is_current = false
     WHERE student_id = $1 AND id <> $2 AND is_current = true`,
    [studentId, insertResult.rows[0].id]
  );

  await syncStudentClassFields(db, studentId, targetClassId, targetSectionId, resolvedRoll);
  return { studentId, success: true, enrollmentId: insertResult.rows[0].id };
}

export async function promoteStudentsBulk(
  db: RequestDb,
  inputs: PromoteStudentInput[]
): Promise<PromoteStudentResult[]> {
  return db.transaction(async (client) => {
    const scopedDb: RequestDb = {
      query: <T = unknown>(text: string, params?: unknown[]) =>
        client.query(text, params) as Promise<QueryResult<T>>,
      getClient: () => Promise.resolve(client),
      transaction: (fn) => fn(client),
    };

    const results: PromoteStudentResult[] = [];
    for (const input of inputs) {
      results.push(await promoteStudent(scopedDb, input));
    }
    return results;
  });
}
