import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api';

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

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
      month && year ? [studentId, month, year] : [studentId]
    );

    const summary = summaryResult.rows[0];
    const totalDays = parseInt(summary.total_days || '0', 10);
    const presentDays = parseInt(summary.present_days || '0', 10);
    const attendancePercentage =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        records: records.rows,
        summary: {
          ...summary,
          attendance_percentage: attendancePercentage,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance' },
      { status: 500 }
    );
  }
}
