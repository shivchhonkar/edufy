import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTimetableSchema } from '@/lib/ensure-timetable-schema';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTimetableSchema(db);

    const staffId = request.nextUrl.searchParams.get('staff_id');
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'staff_id is required' }, { status: 400 });
    }

    const sid = parseInt(staffId, 10);
    const [periods, availability, staffResult] = await Promise.all([
      db.query(
        `SELECT id, name, sort_order
         FROM timetable_periods
         WHERE is_active = true AND COALESCE(is_schedulable, true) = true
         ORDER BY sort_order`,
      ),
      db.query(
        `SELECT day_of_week, period_id, is_available
         FROM teacher_period_availability
         WHERE staff_id = $1`,
        [sid],
      ),
      db.query(`SELECT first_name, last_name, employee_id FROM staff WHERE id = $1`, [sid]),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        staff: staffResult.rows[0] ?? null,
        periods: periods.rows,
        availability: availability.rows,
      },
    });
  } catch (error) {
    console.error('Availability fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load teacher availability' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTimetableSchema(db);

    const body = await request.json();
    const staffId = parseInt(String(body.staff_id), 10);
    const slots = body.slots as
      | { day_of_week: number; period_id: number; is_available: boolean }[]
      | undefined;

    if (!staffId || !slots) {
      return NextResponse.json({ success: false, error: 'staff_id and slots are required' }, { status: 400 });
    }

    await db.query('BEGIN');
    try {
      for (const slot of slots) {
        await db.query(
          `INSERT INTO teacher_period_availability (staff_id, day_of_week, period_id, is_available)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (staff_id, day_of_week, period_id)
           DO UPDATE SET is_available = $4`,
          [staffId, slot.day_of_week, slot.period_id, slot.is_available],
        );
      }
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    return NextResponse.json({ success: true, message: 'Teacher availability saved' });
  } catch (error) {
    console.error('Availability save error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save teacher availability' }, { status: 500 });
  }
}
