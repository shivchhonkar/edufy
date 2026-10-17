import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';
import { actorName } from '@/lib/student-operations-utils';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);

    const body = await request.json();
    const studentId = parseInt(String(body.student_id), 10);
    const healthIssue = String(body.health_issue || '').trim();
    if (!studentId || !healthIssue) {
      return NextResponse.json(
        { success: false, error: 'Student and health issue are required' },
        { status: 400 }
      );
    }

    const reportId = parseInt(String(body.physical_report_id), 10);
    const result = await auth.db.query(
      `INSERT INTO student_health_issues (
        student_id, physical_report_id, academic_year, issue_date,
        health_issue, attended_by, medicine_given, issue_status,
        recorded_by, recorded_by_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *`,
      [
        studentId,
        Number.isFinite(reportId) ? reportId : null,
        body.academic_year || null,
        body.issue_date || new Date().toISOString().split('T')[0],
        healthIssue,
        body.attended_by?.trim() || null,
        body.medicine_given?.trim() || null,
        body.issue_status === 'resolved' ? 'resolved' : 'open',
        auth.user.id,
        actorName(auth.user),
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating health issue:', error);
    return NextResponse.json({ success: false, error: 'Failed to save health issue' }, { status: 500 });
  }
}
