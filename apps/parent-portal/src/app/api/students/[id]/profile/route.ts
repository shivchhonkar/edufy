import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireStudentFromParams } from '@/lib/require-student-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromParams(request, params.id);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    const result = await db.query(
      `SELECT
        s.id, s.first_name, s.middle_name, s.last_name, s.admission_number,
        s.student_code, s.roll_number, s.gender, s.date_of_birth, s.blood_group,
        s.category, s.nationality, s.mother_tongue, s.photo_url, s.status,
        s.address, s.city, s.state, s.pincode,
        COALESCE(sc.name, ec.name) AS class_name,
        COALESCE(ss.name, es.name) AS section_name,
        COALESCE(e.academic_year, '') AS current_academic_year
      FROM students s
      LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
      LEFT JOIN classes sc ON s.class_id = sc.id
      LEFT JOIN sections ss ON s.section_id = ss.id
      LEFT JOIN classes ec ON e.class_id = ec.id
      LEFT JOIN sections es ON e.section_id = es.id
      WHERE s.id = $1`,
      [studentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
