import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api';
import {
  HOMEWORK_DETAIL_SQL,
  normalizeHomeworkRow,
} from '@/lib/parent-portal/ensure-homework-schema';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    const homeworkId = parseInt(params.id, 10);
    if (!Number.isFinite(homeworkId) || homeworkId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid homework id' }, { status: 400 });
    }

    const result = await db.query(HOMEWORK_DETAIL_SQL, [studentId, homeworkId]);

    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Homework not found' }, { status: 404 });
    }

    const row = result.rows[0];
    if (!row.submission_id) {
      const created = await db.query(
        `INSERT INTO homework_submissions (homework_id, student_id, status)
         VALUES ($1, $2, 'pending')
         RETURNING id AS submission_id, submission_url, submission_date, remarks,
                   marks_obtained, status AS submission_status`,
        [homeworkId, studentId],
      );

      if (created.rows.length) {
        Object.assign(row, created.rows[0]);
      }
    }

    return NextResponse.json({
      success: true,
      data: normalizeHomeworkRow(row),
    });
  } catch (error) {
    console.error('Error fetching homework detail:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch homework detail' },
      { status: 500 },
    );
  }
}
