import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { ensureTimetableSchema } from '@/lib/ensure-timetable-schema';
import { requireTeacherAuth, resolveStaffId, ensureTeacherSchema } from '@/lib/teacher-auth';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export async function GET(request: NextRequest) {
  try {
    const auth = requireTeacherAuth(request);
    if (auth instanceof NextResponse) return auth;

    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    await ensureTeacherSchema(db);
    await ensureTimetableSchema(db);

    const staffId = await resolveStaffId(db, auth.user.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const dayFilter = request.nextUrl.searchParams.get('day_of_week');
    const params: number[] = [staffId];
    let dayClause = '';

    if (dayFilter != null && dayFilter !== '') {
      params.push(parseInt(dayFilter, 10));
      dayClause = ` AND ct.day_of_week = $${params.length}`;
    }

    const [periods, entriesResult] = await Promise.all([
      db.query('SELECT * FROM timetable_periods WHERE is_active = true ORDER BY sort_order'),
      db.query(
        `SELECT ct.*, tp.name AS period_name, tp.start_time, tp.end_time, tp.sort_order,
                sub.name AS subject_name,
                cl.name AS class_name, sec.name AS section_name, ct.room
         FROM class_timetable ct
         INNER JOIN timetable_periods tp ON ct.period_id = tp.id
         LEFT JOIN subjects sub ON ct.subject_id = sub.id
         LEFT JOIN classes cl ON ct.class_id = cl.id
         LEFT JOIN sections sec ON ct.section_id = sec.id
         WHERE ct.staff_id = $1${dayClause}
         ORDER BY ct.day_of_week, tp.sort_order`,
        params,
      ),
    ]);

    const entries = (entriesResult.rows as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      day_name: DAY_NAMES[Number(row.day_of_week)] ?? 'Unknown',
    }));

    return NextResponse.json({
      success: true,
      data: {
        entries,
        periods: periods.rows,
        day_names: DAY_NAMES,
        meta: { staff_id: staffId },
      },
    });
  } catch (error) {
    console.error('Teacher timetable error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch timetable' },
      { status: 500 },
    );
  }
}
