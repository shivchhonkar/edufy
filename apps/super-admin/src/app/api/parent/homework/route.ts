import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api';
import {
  buildHomeworkListResponse,
  ensureMissingHomeworkSubmissions,
  HOMEWORK_LIST_SQL,
  normalizeHomeworkRow,
} from '@/lib/parent-portal/ensure-homework-schema';

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    const studentResult = await db.query(
      `SELECT COALESCE(e.class_id, s.class_id) AS class_id
       FROM students s
       LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
       WHERE s.id = $1`,
      [studentId],
    );

    if (!studentResult.rows.length) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    const classId = studentResult.rows[0].class_id;
    if (!classId) {
      return NextResponse.json({
        success: true,
        data: buildHomeworkListResponse([]),
      });
    }

    await ensureMissingHomeworkSubmissions(db, studentId, classId);

    const homeworkResult = await db.query(HOMEWORK_LIST_SQL, [studentId, classId]);
    const items = homeworkResult.rows.map((row) => normalizeHomeworkRow(row));

    return NextResponse.json({
      success: true,
      data: buildHomeworkListResponse(items),
    });
  } catch (error) {
    console.error('Error fetching homework:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch homework' },
      { status: 500 },
    );
  }
}
