import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { parseStudentId, studentExists } from '@/lib/student-profile-api';

export interface StudentSiblingRow {
  id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  admission_number: string;
  roll_number?: string | null;
  status: string;
  class_name?: string | null;
  section_name?: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = parseStudentId(params.id);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }

    if (!(await studentExists(db, studentId))) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const result = await db.query<StudentSiblingRow>(
      `WITH current_phones AS (
         SELECT DISTINCT regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') AS phone
         FROM (
           SELECT parent_phone AS phone FROM students WHERE id = $1
           UNION ALL
           SELECT mother_phone FROM students WHERE id = $1
           UNION ALL
           SELECT mobile FROM student_guardians WHERE student_id = $1
           UNION ALL
           SELECT alternate_mobile FROM student_guardians WHERE student_id = $1
         ) phones
         WHERE phone IS NOT NULL AND phone <> ''
       )
       SELECT DISTINCT ON (s.id)
         s.id,
         s.first_name,
         s.middle_name,
         s.last_name,
         s.admission_number,
         COALESCE(s.roll_number, e.roll_number) AS roll_number,
         s.status,
         COALESCE(sc.name, ec.name) AS class_name,
         COALESCE(ss.name, es.name) AS section_name
       FROM students s
       LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
       LEFT JOIN classes sc ON s.class_id = sc.id
       LEFT JOIN sections ss ON s.section_id = ss.id
       LEFT JOIN classes ec ON e.class_id = ec.id
       LEFT JOIN sections es ON e.section_id = es.id
       WHERE s.id <> $1
         AND s.status = 'active'
         AND EXISTS (SELECT 1 FROM current_phones cp WHERE cp.phone <> '')
         AND (
           EXISTS (
             SELECT 1
             FROM student_guardians sg
             CROSS JOIN current_phones cp
             WHERE sg.student_id = s.id
               AND (
                 regexp_replace(COALESCE(sg.mobile, ''), '\\D', '', 'g') = cp.phone
                 OR regexp_replace(COALESCE(sg.alternate_mobile, ''), '\\D', '', 'g') = cp.phone
               )
           )
           OR EXISTS (
             SELECT 1
             FROM current_phones cp
             WHERE regexp_replace(COALESCE(s.parent_phone, ''), '\\D', '', 'g') = cp.phone
                OR regexp_replace(COALESCE(s.mother_phone, ''), '\\D', '', 'g') = cp.phone
           )
         )
       ORDER BY s.id, s.first_name ASC, s.last_name ASC`,
      [studentId],
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching student siblings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch siblings' },
      { status: 500 },
    );
  }
}
