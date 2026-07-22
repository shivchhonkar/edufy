import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import {
  requireTeacherAuth,
  resolveStaffId,
  teacherHasClassAccess,
  ensureTeacherSchema,
} from '@/lib/teacher-auth';
import {
  buildSubmissionStats,
  ensureHomeworkReviewSchema,
  fetchHomeworkSubmissionsForTeacher,
  normalizeTeacherSubmissionRow,
} from '@/lib/teacher-homework';

export async function GET(
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

    const homeworkId = parseInt(params.id, 10);
    if (!Number.isFinite(homeworkId) || homeworkId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid homework id' }, { status: 400 });
    }

    const homeworkResult = await db.query(
      `SELECT h.*,
        c.name AS class_name,
        sec.name AS section_name,
        s.name AS subject_name,
        u.full_name AS assigned_by_name
      FROM homework h
      LEFT JOIN classes c ON h.class_id = c.id
      LEFT JOIN sections sec ON h.section_id = sec.id
      LEFT JOIN subjects s ON h.subject_id = s.id
      LEFT JOIN users u ON h.assigned_by = u.id
      WHERE h.id = $1`,
      [homeworkId],
    );

    if (!homeworkResult.rows.length) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    const homework = homeworkResult.rows[0];
    const ownsAssignment = Number(homework.assigned_by) === auth.user.id;
    const hasAccess = await teacherHasClassAccess(
      db,
      staffId,
      Number(homework.class_id),
      homework.section_id ? Number(homework.section_id) : null,
    );

    if (!ownsAssignment && !hasAccess) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const submissionsResult = await fetchHomeworkSubmissionsForTeacher(db, homeworkId);
    const submissions = submissionsResult.rows.map((row) => normalizeTeacherSubmissionRow(row));
    const stats = buildSubmissionStats(submissions);

    return NextResponse.json({
      success: true,
      data: {
        ...homework,
        submissions,
        stats,
      },
    });
  } catch (error) {
    console.error('Teacher homework detail error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch assignment' },
      { status: 500 },
    );
  }
}
