import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { parseStudentId, studentExists } from '@/lib/student-profile-api';
import type { StudentEnrollment } from '@/shared/types';

export interface StudentEnrollmentWithDetails extends StudentEnrollment {
  class_name?: string;
  section_name?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const currentOnly = request.nextUrl.searchParams.get('current') === 'true';

    let queryText = `
      SELECT
        e.*,
        c.name AS class_name,
        sec.name AS section_name
      FROM student_enrollments e
      LEFT JOIN classes c ON e.class_id = c.id
      LEFT JOIN sections sec ON e.section_id = sec.id
      WHERE e.student_id = $1`;

    const queryParams: number[] = [studentId];

    if (currentOnly) {
      queryText += ' AND e.is_current = true';
    }

    queryText += ' ORDER BY e.is_current DESC, e.created_at DESC, e.id DESC';

    const result = await db.query<StudentEnrollmentWithDetails>(queryText, queryParams);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching student enrollments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}
