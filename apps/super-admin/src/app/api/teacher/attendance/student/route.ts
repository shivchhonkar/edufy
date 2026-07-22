import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError, type RequestDb } from '@/lib/request-db';
import {
  requireTeacherAuth,
  resolveStaffId,
  ensureTeacherSchema,
} from '@/lib/teacher-auth';

async function teacherCanAccessStudent(
  db: RequestDb,
  staffId: number,
  studentId: number,
): Promise<boolean> {
  const result = await db.query(
    `SELECT s.id
     FROM students s
     JOIN teacher_assignments ta ON ta.staff_id = $1 AND ta.class_id = s.class_id
       AND (ta.section_id IS NULL OR ta.section_id = s.section_id)
     WHERE s.id = $2
     LIMIT 1`,
    [staffId, studentId],
  );
  return result.rows.length > 0;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireTeacherAuth(request);
    if (auth instanceof NextResponse) return auth;

    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    await ensureTeacherSchema(db);

    const staffId = await resolveStaffId(db, auth.user.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const studentIdParam = request.nextUrl.searchParams.get('student_id');
    if (!studentIdParam) {
      return NextResponse.json({ success: false, error: 'student_id is required' }, { status: 400 });
    }

    const studentId = parseInt(studentIdParam, 10);
    if (!Number.isFinite(studentId) || studentId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid student_id' }, { status: 400 });
    }

    const allowed = await teacherCanAccessStudent(db, staffId, studentId);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'You are not assigned to this student\'s class' },
        { status: 403 },
      );
    }

    const month = request.nextUrl.searchParams.get('month');
    const year = request.nextUrl.searchParams.get('year');

    let queryText = `
      SELECT id, date, status, remarks, created_at
      FROM attendance
      WHERE student_id = $1`;
    const queryParams: (number | string)[] = [studentId];

    if (month && year) {
      queryText += ` AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`;
      queryParams.push(month, year);
    }

    queryText += ' ORDER BY date DESC LIMIT 120';

    const records = await db.query(queryText, queryParams);

    const summaryResult = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'present') AS present_days,
        COUNT(*) FILTER (WHERE status = 'absent') AS absent_days,
        COUNT(*) FILTER (WHERE status = 'late') AS late_days,
        COUNT(*) FILTER (WHERE status = 'on_leave') AS leave_days,
        COUNT(*) AS total_days
       FROM attendance
       WHERE student_id = $1
       ${month && year ? 'AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3' : ''}`,
      month && year ? [studentId, month, year] : [studentId],
    );

    const summary = summaryResult.rows[0];
    const totalDays = parseInt(summary.total_days || '0', 10);
    const presentDays = parseInt(summary.present_days || '0', 10);
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    const studentResult = await db.query(
      `SELECT s.id, s.first_name, s.last_name, s.admission_number, s.roll_number,
              c.name AS class_name, sec.name AS section_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE s.id = $1`,
      [studentId],
    );

    return NextResponse.json({
      success: true,
      data: {
        student: studentResult.rows[0] ?? null,
        records: records.rows,
        summary: {
          ...summary,
          attendance_percentage: attendancePercentage,
        },
      },
    });
  } catch (error) {
    console.error('Teacher student attendance fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance' },
      { status: 500 },
    );
  }
}
