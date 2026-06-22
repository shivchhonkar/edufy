import type { RequestDb } from '@/lib/request-db';

export interface SchoolHouse {
  id: number;
  name: string;
  code: string | null;
  color: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  student_count?: number;
  created_at?: string;
  updated_at?: string;
}

async function getActiveAcademicYear(db: RequestDb) {
  const ayResult = await db.query<{ id: number; name: string }>(
    'SELECT id, name FROM academic_years WHERE is_active = true LIMIT 1',
  );
  return {
    academicYearId: ayResult.rows[0]?.id ?? null,
    academicYear:
      ayResult.rows[0]?.name ||
      `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`,
  };
}

export async function assignStudentsToHouse(
  db: RequestDb,
  studentIds: number[],
  houseId: number | null,
): Promise<{ updated: number; created: number }> {
  if (studentIds.length === 0) {
    return { updated: 0, created: 0 };
  }

  const updateResult = await db.query(
    `UPDATE student_enrollments
     SET house_id = $1, updated_at = CURRENT_TIMESTAMP
     WHERE student_id = ANY($2::int[]) AND is_current = true`,
    [houseId, studentIds],
  );

  const missingResult = await db.query<{ student_id: number }>(
    `SELECT s.id AS student_id
     FROM unnest($1::int[]) AS s(id)
     WHERE NOT EXISTS (
       SELECT 1 FROM student_enrollments e
       WHERE e.student_id = s.id AND e.is_current = true
     )`,
    [studentIds],
  );

  const missingIds = missingResult.rows.map((row) => row.student_id);
  if (missingIds.length === 0) {
    return { updated: updateResult.rowCount ?? 0, created: 0 };
  }

  const { academicYearId, academicYear } = await getActiveAcademicYear(db);
  let created = 0;

  for (const studentId of missingIds) {
    const studentResult = await db.query<{
      class_id: number | null;
      section_id: number | null;
      roll_number: string | null;
    }>('SELECT class_id, section_id, roll_number FROM students WHERE id = $1', [studentId]);

    const student = studentResult.rows[0];
    if (!student) continue;

    await db.query(
      `INSERT INTO student_enrollments (
        student_id, academic_year_id, academic_year, class_id, section_id,
        roll_number, house_id, status, is_current
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', true)`,
      [
        studentId,
        academicYearId,
        academicYear,
        student.class_id,
        student.section_id,
        student.roll_number,
        houseId,
      ],
    );
    created += 1;
  }

  return {
    updated: updateResult.rowCount ?? 0,
    created,
  };
}
