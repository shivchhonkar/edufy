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

/** Teaching staff: Teaching department or Type = TEACHER, excluding known non-teaching roles. */
export const TEACHER_WHERE_CLAUSE = `
  (
    d.code = 'TCH'
    OR LOWER(TRIM(COALESCE(d.name, ''))) = 'teaching'
    OR UPPER(TRIM(COALESCE(s.staff_type, ''))) = 'TEACHER'
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

type StaffTypeFields = {
  staff_type: string | null;
  department: string | null;
  department_id: number | null;
  designation: string | null;
  designation_id: number | null;
};

/** When Type is TEACHER, fill Teaching department and Teacher designation if those are blank. */
export async function applyStaffTypeDefaults<T extends StaffTypeFields>(db: RequestDb, fields: T): Promise<T> {
  const type = (fields.staff_type || '').trim().toUpperCase();
  if (type !== 'TEACHER') return fields;

  const teachingDepartmentId = await resolveTeachingDepartmentId(db);
  if (!fields.department_id && teachingDepartmentId) {
    fields.department_id = teachingDepartmentId;
    fields.department = fields.department || 'Teaching';
  }
  if (!fields.designation) {
    fields.designation = 'Teacher';
  }
  if (!fields.designation_id && teachingDepartmentId) {
    const designation = await db.query<{ id: number }>(
      `SELECT id FROM designations
       WHERE name ILIKE 'Teacher'
         AND (department_id = $1 OR department_id IS NULL)
       ORDER BY CASE WHEN department_id = $1 THEN 0 ELSE 1 END, id
       LIMIT 1`,
      [teachingDepartmentId],
    );
    if (designation.rows[0]) {
      fields.designation_id = designation.rows[0].id;
    }
  }
  return fields;
}
