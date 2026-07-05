import type { RequestDb } from '@/lib/request-db';

/** Roles that must never appear on the academics teachers list. */
export const NON_TEACHING_ROLE_SQL = `
  COALESCE(s.designation, '') ILIKE ANY (ARRAY[
    '%principal%',
    '%vice principal%',
    '%vice-principal%',
    '%clerk%',
    '%driver%',
    '%transport%',
    '%administrator%',
    '%admin officer%',
    '%peon%',
    '%security%',
    '%accountant%',
    '%librarian%'
  ])
  OR COALESCE(des.name, '') ILIKE ANY (ARRAY[
    '%principal%',
    '%vice principal%',
    '%vice-principal%',
    '%clerk%',
    '%driver%',
    '%transport%',
    '%administrator%',
    '%admin officer%',
    '%peon%',
    '%security%',
    '%accountant%',
    '%librarian%'
  ])
`;

/** Only staff in the Teaching department, excluding known non-teaching roles. */
export const TEACHER_WHERE_CLAUSE = `
  (
    d.code = 'TCH'
    OR LOWER(TRIM(COALESCE(d.name, ''))) = 'teaching'
  )
  AND NOT (${NON_TEACHING_ROLE_SQL})
`;

export const TEACHER_LIST_SELECT = `
  SELECT s.*,
    d.name AS department_name,
    des.name AS designation_name,
    (
      SELECT COUNT(*)::int
      FROM teacher_assignments ta
      WHERE ta.staff_id = s.id
    ) AS assignment_count
  FROM staff s
  LEFT JOIN departments d ON s.department_id = d.id
  LEFT JOIN designations des ON s.designation_id = des.id
`;

export async function resolveTeachingDepartmentId(db: RequestDb): Promise<number | null> {
  const result = await db.query<{ id: number }>(
    `SELECT id FROM departments WHERE name ILIKE 'Teaching' OR code = 'TCH' ORDER BY id LIMIT 1`,
  );
  return result.rows[0]?.id ?? null;
}

export function isTeachingDepartmentName(name?: string | null) {
  return (name || '').trim().toLowerCase() === 'teaching';
}
