import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { classNameOrderSql } from '@/lib/class-sort';

function monthDateRange(month: number, year: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);

    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'attendance'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      return NextResponse.json({
        success: false,
        error: 'Student attendance table not found.',
        migration_required: true,
      }, { status: 503 });
    }

    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('class_id');
    const sectionId = searchParams.get('section_id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let startDate = searchParams.get('start_date');
    let endDate = searchParams.get('end_date');

    if (month && year) {
      const range = monthDateRange(parseInt(month, 10), parseInt(year, 10));
      startDate = range.start;
      endDate = range.end;
    }

    if (!startDate || !endDate) {
      const now = new Date();
      const range = monthDateRange(now.getMonth() + 1, now.getFullYear());
      startDate = range.start;
      endDate = range.end;
    }

    const queryParams: (string | number)[] = [startDate, endDate];
    let paramCount = 2;
    let classFilter = '';
    let sectionFilter = '';

    if (classId) {
      paramCount += 1;
      classFilter = ` AND s.class_id = $${paramCount}`;
      queryParams.push(classId);
    }

    if (sectionId) {
      paramCount += 1;
      sectionFilter = ` AND s.section_id = $${paramCount}`;
      queryParams.push(sectionId);
    }

    const classOrder = classNameOrderSql('c.name');

    const result = await db.query(
      `
      SELECT
        s.id AS student_id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.roll_number,
        c.name AS class_name,
        sec.name AS section_name,
        COUNT(a.id) FILTER (WHERE a.status = 'present')::int AS present,
        COUNT(a.id) FILTER (WHERE a.status = 'absent')::int AS absent,
        COUNT(a.id) FILTER (WHERE a.status = 'late')::int AS late,
        COUNT(a.id) FILTER (WHERE a.status = 'on_leave')::int AS on_leave,
        COUNT(a.id) FILTER (WHERE a.status = 'half_day')::int AS half_day,
        COUNT(a.id)::int AS total_marked
      FROM students s
      LEFT JOIN attendance a
        ON a.student_id = s.id
        AND a.date >= $1
        AND a.date <= $2
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE s.status = 'active'
        ${classFilter}
        ${sectionFilter}
      GROUP BY s.id, s.first_name, s.last_name, s.admission_number, s.roll_number, c.name, sec.name
      ORDER BY ${classOrder}, sec.name ASC NULLS LAST, s.first_name ASC, s.last_name ASC
      `,
      queryParams
    );

    const students = result.rows.map((row) => {
      const totalMarked = Number(row.total_marked) || 0;
      const present = Number(row.present) || 0;
      const attendancePercentage =
        totalMarked > 0 ? Math.round((present / totalMarked) * 100) : 0;

      return {
        ...row,
        present,
        absent: Number(row.absent) || 0,
        late: Number(row.late) || 0,
        on_leave: Number(row.on_leave) || 0,
        half_day: Number(row.half_day) || 0,
        total_marked: totalMarked,
        attendance_percentage: attendancePercentage,
      };
    });

    const summary = students.reduce(
      (acc, student) => ({
        total_students: acc.total_students + 1,
        present: acc.present + student.present,
        absent: acc.absent + student.absent,
        late: acc.late + student.late,
        on_leave: acc.on_leave + student.on_leave,
        half_day: acc.half_day + student.half_day,
        total_marked: acc.total_marked + student.total_marked,
      }),
      {
        total_students: 0,
        present: 0,
        absent: 0,
        late: 0,
        on_leave: 0,
        half_day: 0,
        total_marked: 0,
      }
    );

    const attendancePercentage =
      summary.total_marked > 0
        ? Math.round((summary.present / summary.total_marked) * 100)
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        period: { start_date: startDate, end_date: endDate },
        summary: { ...summary, attendance_percentage: attendancePercentage },
        students,
      },
    });
  } catch (error) {
    console.error('Error generating student attendance report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate student attendance report' },
      { status: 500 }
    );
  }
}
