import type { RequestDb } from '@/lib/request-db';

/** Exit reason code for students who passed the final / highest class. */
export const ALUMNI_EXIT_REASON_CODE = 'COMPLETED';

export interface HighestClassInfo {
  id: number;
  name: string;
  class_num: number | null;
}

export function parseClassNumericRank(className: string | null | undefined): number | null {
  if (!className?.trim()) return null;
  const match = className.match(/(\d+)/);
  if (!match) return null;
  const parsed = parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getHighestClass(db: RequestDb): Promise<HighestClassInfo | null> {
  const result = await db.query<{ id: number; name: string }>(
    `SELECT id, name
     FROM classes
     WHERE COALESCE(is_active, true) = true`
  );

  if (result.rows.length === 0) return null;

  let highest: HighestClassInfo | null = null;
  for (const row of result.rows) {
    const class_num = parseClassNumericRank(row.name);
    const candidate: HighestClassInfo = { id: row.id, name: row.name, class_num };
    if (!highest) {
      highest = candidate;
      continue;
    }

    const highestNum = highest.class_num ?? -1;
    const candidateNum = candidate.class_num ?? -1;
    if (candidateNum > highestNum || (candidateNum === highestNum && candidate.id > highest.id)) {
      highest = candidate;
    }
  }

  return highest;
}

/** SQL CTE: resolves the school's highest class (by numeric rank in name, e.g. Class 12). */
export const HIGHEST_CLASS_CTE = `
  highest_class AS (
    SELECT c.id, c.name,
      COALESCE(NULLIF(substring(c.name from '(\\d+)'), ''), '-1')::int AS class_num
    FROM classes c
    WHERE COALESCE(c.is_active, true) = true
    ORDER BY COALESCE(NULLIF(substring(c.name from '(\\d+)'), ''), '-1')::int DESC, c.id DESC
    LIMIT 1
  )
`;

/** Latest enrollment row for class/section lookup at exit time. */
export const LATEST_ENROLLMENT_LATERAL = `
  LEFT JOIN LATERAL (
    SELECT e.academic_year, e.class_id, cl.name AS class_name, sc.name AS section_name
    FROM student_enrollments e
    LEFT JOIN classes cl ON cl.id = e.class_id
    LEFT JOIN sections sc ON sc.id = e.section_id
    WHERE e.student_id = s.id
    ORDER BY e.is_current DESC, e.id DESC
    LIMIT 1
  ) en ON true
`;

/** Match student last class to highest class (by id, exact name, or numeric rank). */
export const ALUMNI_HIGHEST_CLASS_MATCH = `
  (
    en.class_id = hc.id
    OR COALESCE(se.student_snapshot->>'class_name', en.class_name) = hc.name
    OR (
      hc.class_num >= 0
      AND COALESCE(
        NULLIF(substring(COALESCE(se.student_snapshot->>'class_name', en.class_name) from '(\\d+)'), '')::int,
        -1
      ) = hc.class_num
    )
  )
`;

export async function isStudentAlumniEligible(
  db: RequestDb,
  studentId: number
): Promise<boolean> {
  const result = await db.query<{ eligible: boolean }>(
    `WITH ${HIGHEST_CLASS_CTE}
     SELECT EXISTS (
       SELECT 1
       FROM students s
       INNER JOIN student_exits se ON se.student_id = s.id
         AND se.status = 'EXITED'
         AND se.exit_reason_code = $2
       CROSS JOIN highest_class hc
       ${LATEST_ENROLLMENT_LATERAL}
       WHERE s.id = $1
         AND ${ALUMNI_HIGHEST_CLASS_MATCH}
     ) AS eligible`,
    [studentId, ALUMNI_EXIT_REASON_CODE]
  );

  return Boolean(result.rows[0]?.eligible);
}
