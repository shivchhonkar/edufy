import type { RequestDb } from '@/lib/request-db';
import {
  academicYearFilterValues,
  parseAcademicYear,
} from '@/lib/fees/AcademicYear';
import type { DashboardStudentStats } from '@/shared/types';

const EMPTY_STATS: DashboardStudentStats = {
  total: 0,
  boys: 0,
  girls: 0,
  new_admissions: 0,
  previous_students: 0,
};

export async function fetchStudentDashboardStats(
  db: RequestDb,
  academicYear: string,
): Promise<DashboardStudentStats> {
  const yearVariants = academicYearFilterValues(academicYear);
  const sessionStart = parseAcademicYear(academicYear).startDate;

  const genderResult = await db.query<{
    total: string;
    boys: string;
    girls: string;
  }>(
    `SELECT
      COUNT(*)::text AS total,
      COUNT(*) FILTER (WHERE gender = 'Male')::text AS boys,
      COUNT(*) FILTER (WHERE gender = 'Female')::text AS girls
     FROM students
     WHERE status = 'active'`,
  );

  let newAdmissions = 0;
  let previousStudents = 0;

  try {
    const cohortResult = await db.query<{ new_count: string; old_count: string }>(
      `SELECT
        COUNT(*) FILTER (
          WHERE NOT EXISTS (
            SELECT 1 FROM student_enrollments prev
            WHERE prev.student_id = s.id
              AND NOT (prev.academic_year = ANY($1::text[]))
          )
        )::text AS new_count,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM student_enrollments prev
            WHERE prev.student_id = s.id
              AND NOT (prev.academic_year = ANY($1::text[]))
          )
        )::text AS old_count
       FROM students s
       WHERE s.status = 'active'`,
      [yearVariants],
    );
    newAdmissions = parseInt(cohortResult.rows[0]?.new_count || '0', 10);
    previousStudents = parseInt(cohortResult.rows[0]?.old_count || '0', 10);
  } catch {
    const fallback = await db.query<{ new_count: string; old_count: string }>(
      `SELECT
        COUNT(*) FILTER (WHERE admission_date >= $1::date)::text AS new_count,
        COUNT(*) FILTER (WHERE admission_date < $1::date)::text AS old_count
       FROM students
       WHERE status = 'active'`,
      [sessionStart],
    );
    newAdmissions = parseInt(fallback.rows[0]?.new_count || '0', 10);
    previousStudents = parseInt(fallback.rows[0]?.old_count || '0', 10);
  }

  const row = genderResult.rows[0];
  return {
    total: parseInt(row?.total || '0', 10),
    boys: parseInt(row?.boys || '0', 10),
    girls: parseInt(row?.girls || '0', 10),
    new_admissions: newAdmissions,
    previous_students: previousStudents,
  };
}

export { EMPTY_STATS as EMPTY_STUDENT_STATS };
