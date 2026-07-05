import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTimetableSchema } from '@/lib/ensure-timetable-schema';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTimetableSchema(db);

    const [workingDays, periods] = await Promise.all([
      db.query(
        `SELECT day_of_week, day_name, is_working, teaching_period_count
         FROM school_working_days
         ORDER BY CASE WHEN day_of_week = 0 THEN 7 ELSE day_of_week END`,
      ),
      db.query(
        `SELECT id, name, start_time, end_time, sort_order, is_active,
                COALESCE(slot_type, 'period') AS slot_type,
                COALESCE(is_schedulable, true) AS is_schedulable,
                COALESCE(period_category, 'study') AS period_category
         FROM timetable_periods
         ORDER BY sort_order, id`,
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        working_days: workingDays.rows,
        periods: periods.rows,
      },
    });
  } catch (error) {
    console.error('Timetable setup fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load timetable setup' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTimetableSchema(db);
    const body = await request.json();
    const workingDays = body.working_days as
      | { day_of_week: number; is_working: boolean; teaching_period_count: number }[]
      | undefined;

    if (!workingDays?.length) {
      return NextResponse.json({ success: false, error: 'working_days is required' }, { status: 400 });
    }

    for (const day of workingDays) {
      await db.query(
        `UPDATE school_working_days
         SET is_working = $2, teaching_period_count = $3
         WHERE day_of_week = $1`,
        [day.day_of_week, day.is_working, day.teaching_period_count],
      );
    }

    return NextResponse.json({ success: true, message: 'Working week updated' });
  } catch (error) {
    console.error('Timetable setup update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update working week' }, { status: 500 });
  }
}
