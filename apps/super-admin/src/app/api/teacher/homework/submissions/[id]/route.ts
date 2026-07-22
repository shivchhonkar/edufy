import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import {
  requireTeacherAuth,
  resolveStaffId,
  teacherHasClassAccess,
  ensureTeacherSchema,
} from '@/lib/teacher-auth';
import {
  applyTeacherSubmissionAction,
  ensureHomeworkReviewSchema,
  normalizeTeacherSubmissionRow,
  type TeacherSubmissionAction,
} from '@/lib/teacher-homework';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = requireTeacherAuth(request);
    if (auth instanceof NextResponse) return auth;

    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    await ensureTeacherSchema(db);
    await ensureHomeworkReviewSchema(db);

    const staffId = await resolveStaffId(db, auth.user.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const submissionId = parseInt(params.id, 10);
    if (!Number.isFinite(submissionId) || submissionId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid submission id' }, { status: 400 });
    }

    const body = await request.json();
    const action = String(body?.action ?? 'grade') as TeacherSubmissionAction;
    const allowedActions = new Set<TeacherSubmissionAction>(['grade', 'reject', 'request_resubmit']);
    if (!allowedActions.has(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const ownership = await db.query(
      `SELECT hs.id, hs.status, h.assigned_by, h.class_id, h.section_id
       FROM homework_submissions hs
       JOIN homework h ON h.id = hs.homework_id
       WHERE hs.id = $1`,
      [submissionId],
    );

    if (!ownership.rows.length) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }

    const row = ownership.rows[0];
    const ownsAssignment = Number(row.assigned_by) === auth.user.id;
    const hasAccess = await teacherHasClassAccess(
      db,
      staffId,
      Number(row.class_id),
      row.section_id ? Number(row.section_id) : null,
    );

    if (!ownsAssignment && !hasAccess) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (action === 'grade' && row.status === 'pending') {
      return NextResponse.json(
        { success: false, error: 'Cannot grade a submission that has not been submitted yet' },
        { status: 400 },
      );
    }

    if ((action === 'reject' || action === 'request_resubmit') && row.status === 'pending') {
      return NextResponse.json(
        { success: false, error: 'Cannot review a submission that has not been submitted yet' },
        { status: 400 },
      );
    }

    const marks =
      body?.marks_obtained != null && body?.marks_obtained !== ''
        ? Number(body.marks_obtained)
        : null;

    const result = await applyTeacherSubmissionAction(db, submissionId, auth.user.id, {
      action,
      marks_obtained: marks,
      feedback: body?.feedback ?? null,
    });

    return NextResponse.json({
      success: true,
      data: normalizeTeacherSubmissionRow(result.rows[0]),
      message:
        action === 'grade'
          ? 'Submission graded successfully'
          : action === 'reject'
            ? 'Submission rejected'
            : 'Resubmission requested',
    });
  } catch (error) {
    console.error('Teacher submission review error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update submission' },
      { status: 500 },
    );
  }
}
