import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { getParentSession, requireParentStudentAccess } from '@/lib/parent-auth';
import { submitHomeworkUpdate } from '@/lib/parent-portal/ensure-homework-schema';

export async function POST(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const session = getParentSession(request);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const submissionId = parseInt(String(body?.submission_id ?? ''), 10);
    const homeworkId = parseInt(String(body?.homework_id ?? ''), 10);
    const studentId = parseInt(String(body?.student_id ?? ''), 10);
    const submissionText = String(body?.submission_text ?? '').trim();

    if (!submissionText) {
      return NextResponse.json(
        { success: false, error: 'Submission text is required' },
        { status: 400 },
      );
    }

    let resolvedSubmissionId = Number.isFinite(submissionId) && submissionId > 0 ? submissionId : null;

    if (!resolvedSubmissionId) {
      if (!Number.isFinite(homeworkId) || homeworkId <= 0 || !Number.isFinite(studentId) || studentId <= 0) {
        return NextResponse.json(
          { success: false, error: 'Submission ID or homework details are required' },
          { status: 400 },
        );
      }

      const auth = requireParentStudentAccess(request, studentId);
      if (auth instanceof NextResponse) return auth;

      const existing = await db.query(
        `SELECT id, status FROM homework_submissions
         WHERE homework_id = $1 AND student_id = $2`,
        [homeworkId, studentId],
      );

      if (existing.rows.length) {
        if (existing.rows[0].status === 'graded') {
          return NextResponse.json(
            { success: false, error: 'This homework has already been graded' },
            { status: 400 },
          );
        }
        resolvedSubmissionId = existing.rows[0].id;
      } else {
        const created = await db.query(
          `INSERT INTO homework_submissions (homework_id, student_id, status)
           VALUES ($1, $2, 'pending')
           RETURNING id`,
          [homeworkId, studentId],
        );
        resolvedSubmissionId = created.rows[0]?.id ?? null;
      }
    }

    if (!resolvedSubmissionId) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }

    const ownership = await db.query(
      'SELECT student_id, status FROM homework_submissions WHERE id = $1',
      [resolvedSubmissionId],
    );
    if (!ownership.rows.length) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }

    const ownerStudentId = ownership.rows[0].student_id as number;
    const auth = requireParentStudentAccess(request, ownerStudentId);
    if (auth instanceof NextResponse) return auth;

    if (ownership.rows[0].status === 'graded') {
      return NextResponse.json(
        { success: false, error: 'This homework has already been graded' },
        { status: 400 },
      );
    }

    const result = await submitHomeworkUpdate(db, submissionText, resolvedSubmissionId);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Homework submitted successfully',
    });
  } catch (error) {
    console.error('Error submitting homework:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to submit homework' },
      { status: 500 },
    );
  }
}
