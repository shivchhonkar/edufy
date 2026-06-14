import { query } from '@/lib/db';

const CHILDREN_SELECT = `
  SELECT DISTINCT ON (s.id)
    s.id,
    s.first_name,
    s.middle_name,
    s.last_name,
    s.admission_number,
    s.roll_number,
    s.gender,
    s.date_of_birth,
    s.blood_group,
    s.photo_url,
    s.status,
    COALESCE(c.name, c2.name) AS class_name,
    COALESCE(sec.name, sec2.name) AS section_name,
    COALESCE(e.academic_year, '') AS current_academic_year
  FROM students s
  LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
  LEFT JOIN classes c ON e.class_id = c.id
  LEFT JOIN sections sec ON e.section_id = sec.id
  LEFT JOIN classes c2 ON s.class_id = c2.id
  LEFT JOIN sections sec2 ON s.section_id = sec2.id
`;

export async function resolveParentStudentIds(phone: string): Promise<number[]> {
  const ids = new Set<number>();

  try {
    const guardianResult = await query(
      `SELECT DISTINCT student_id FROM student_guardians
       WHERE mobile = $1 OR alternate_mobile = $1`,
      [phone]
    );
    guardianResult.rows.forEach((row: { student_id: number }) => ids.add(row.student_id));
  } catch {
    // student_guardians may not exist on older DBs
  }

  const legacyResult = await query(
    `SELECT id FROM students WHERE parent_phone = $1 AND status = 'active'`,
    [phone]
  );
  legacyResult.rows.forEach((row: { id: number }) => ids.add(row.id));

  return Array.from(ids);
}

export async function fetchChildrenByIds(studentIds: number[]) {
  if (studentIds.length === 0) return [];

  const result = await query(
    `${CHILDREN_SELECT}
     WHERE s.id = ANY($1::int[]) AND s.status = 'active'
     ORDER BY s.id, s.first_name, s.last_name`,
    [studentIds]
  );

  return result.rows;
}
