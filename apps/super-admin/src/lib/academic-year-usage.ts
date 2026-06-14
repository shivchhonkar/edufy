import type { RequestDb } from '@/lib/request-db';

type UsageCheck = {
  label: string;
  sql: string;
  params: (yearId: number, yearName: string) => unknown[];
};

const USAGE_CHECKS: UsageCheck[] = [
  {
    label: 'classes',
    sql: 'SELECT COUNT(*)::int AS count FROM classes WHERE academic_year = $1',
    params: (_, name) => [name],
  },
  {
    label: 'student fees',
    sql: 'SELECT COUNT(*)::int AS count FROM student_fees WHERE academic_year = $1',
    params: (_, name) => [name],
  },
  {
    label: 'fee structures',
    sql: 'SELECT COUNT(*)::int AS count FROM fee_structures WHERE academic_year = $1',
    params: (_, name) => [name],
  },
  {
    label: 'fee payments',
    sql: 'SELECT COUNT(*)::int AS count FROM fee_payments WHERE academic_year = $1',
    params: (_, name) => [name],
  },
  {
    label: 'student enrollments',
    sql: `SELECT COUNT(*)::int AS count FROM student_enrollments
          WHERE academic_year_id = $1 OR academic_year = $2`,
    params: (id, name) => [id, name],
  },
  {
    label: 'exams',
    sql: 'SELECT COUNT(*)::int AS count FROM exams WHERE academic_year = $1',
    params: (_, name) => [name],
  },
  {
    label: 'timetable',
    sql: 'SELECT COUNT(*)::int AS count FROM timetable WHERE academic_year = $1',
    params: (_, name) => [name],
  },
  {
    label: 'payment receipts',
    sql: 'SELECT COUNT(*)::int AS count FROM payment_receipts WHERE academic_year = $1',
    params: (_, name) => [name],
  },
];

export async function getAcademicYearAssociations(
  db: RequestDb,
  yearId: number,
  yearName: string
): Promise<string[]> {
  const associations: string[] = [];

  for (const check of USAGE_CHECKS) {
    try {
      const result = await db.query<{ count: number }>(
        check.sql,
        check.params(yearId, yearName)
      );
      if ((result.rows[0]?.count ?? 0) > 0) {
        associations.push(check.label);
      }
    } catch {
      // table/column may not exist on older tenant DBs
    }
  }

  return associations;
}

export function isAcademicYearDeletable(
  isActive: boolean,
  associations: string[]
): boolean {
  return !isActive && associations.length === 0;
}
