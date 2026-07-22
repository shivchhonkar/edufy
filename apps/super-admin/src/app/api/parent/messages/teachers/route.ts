import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { ensureTeacherSchema } from '@/lib/teacher-auth';
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api';

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    await ensureTeacherSchema(db);

    const result = await db.query(
      `SELECT DISTINCT ON (ta.staff_id)
        ta.staff_id,
        st.first_name || ' ' || st.last_name AS teacher_name,
        sub.name AS subject_name,
        ta.is_class_teacher
       FROM students s
       INNER JOIN teacher_assignments ta ON ta.class_id = s.class_id
         AND (ta.section_id IS NULL OR ta.section_id = s.section_id)
       INNER JOIN staff st ON ta.staff_id = st.id
       LEFT JOIN subjects sub ON ta.subject_id = sub.id
       WHERE s.id = $1 AND s.status = 'active'
       ORDER BY ta.staff_id, ta.is_class_teacher DESC, sub.name NULLS LAST`,
      [studentId],
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Parent message teachers GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch teachers' },
      { status: 500 },
    );
  }
}
