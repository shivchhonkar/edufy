import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError, type RequestDb } from '@/lib/request-db';
import {
  requireTeacherAuth,
  resolveStaffId,
  teacherHasClassAccess,
  ensureTeacherSchema,
} from '@/lib/teacher-auth';

async function assertClassAccess(
  db: RequestDb,
  staffId: number,
  classId: number,
  sectionId: number | null,
) {
  const hasAccess = await teacherHasClassAccess(db, staffId, classId, sectionId);
  if (!hasAccess) {
    return NextResponse.json(
      { success: false, error: 'You are not assigned to this class' },
      { status: 403 },
    );
  }
  return null;
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

    const classId = request.nextUrl.searchParams.get('class_id');
    const sectionId = request.nextUrl.searchParams.get('section_id');
    const month = request.nextUrl.searchParams.get('month');
    const year = request.nextUrl.searchParams.get('year');

    if (!classId || !month || !year) {
      return NextResponse.json(
        { success: false, error: 'class_id, month, and year are required' },
        { status: 400 },
      );
    }

    const classIdNum = parseInt(classId, 10);
    const sectionIdNum = sectionId ? parseInt(sectionId, 10) : null;
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    const accessError = await assertClassAccess(db, staffId, classIdNum, sectionIdNum);
    if (accessError) return accessError;

    const sectionClause = sectionIdNum ? ' AND s.section_id = $4' : '';
    const params: number[] = [classIdNum, monthNum, yearNum];
    if (sectionIdNum) params.push(sectionIdNum);

    const result = await db.query(
      `SELECT
         a.date::date AS date,
         COUNT(*) FILTER (WHERE a.status = 'present') AS present_count,
         COUNT(*) FILTER (WHERE a.status = 'absent') AS absent_count,
         COUNT(*) FILTER (WHERE a.status IN ('on_leave', 'leave')) AS leave_count,
         COUNT(*) AS marked_count
       FROM attendance a
       JOIN students s ON s.id = a.student_id
       WHERE s.class_id = $1
         AND EXTRACT(MONTH FROM a.date) = $2
         AND EXTRACT(YEAR FROM a.date) = $3
         ${sectionClause}
       GROUP BY a.date::date
       ORDER BY a.date::date`,
      params,
    );

    const studentCountResult = await db.query(
      `SELECT COUNT(*) AS total
       FROM students s
       WHERE s.class_id = $1 AND s.status = 'active'${sectionIdNum ? ' AND s.section_id = $2' : ''}`,
      sectionIdNum ? [classIdNum, sectionIdNum] : [classIdNum],
    );

    const totalStudents = Number(studentCountResult.rows[0]?.total ?? 0);

    const daily = result.rows.map((row) => {
      const marked = Number(row.marked_count ?? 0);
      const present = Number(row.present_count ?? 0);
      const percentage = marked > 0 ? Math.round((present / marked) * 10000) / 100 : 0;

      return {
        date: row.date,
        present_count: present,
        absent_count: Number(row.absent_count ?? 0),
        leave_count: Number(row.leave_count ?? 0),
        marked_count: marked,
        total_students: totalStudents,
        attendance_percentage: percentage,
      };
    });

    const averagePercentage =
      daily.length > 0
        ? Math.round(
            (daily.reduce((sum, row) => sum + row.attendance_percentage, 0) / daily.length) * 100,
          ) / 100
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        daily,
        average_percentage: averagePercentage,
        total_students: totalStudents,
      },
    });
  } catch (error) {
    console.error('Teacher attendance overview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance overview' },
      { status: 500 },
    );
  }
}
