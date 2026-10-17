import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';

const FALLBACK = {
  work_start_time: '09:00:00',
  work_end_time: '17:00:00',
  late_tolerance_minutes: 15,
  half_day_threshold_hours: 4,
};

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const result = await db.query(`
      SELECT
        to_char(work_start_time, 'HH24:MI') AS work_start_time,
        to_char(work_end_time, 'HH24:MI') AS work_end_time,
        late_tolerance_minutes,
        half_day_threshold_hours
      FROM attendance_policies
      WHERE is_active IS DISTINCT FROM false
      ORDER BY id ASC
      LIMIT 1
    `);

    return NextResponse.json({
      success: true,
      data: result.rows[0] ?? FALLBACK,
    });
  } catch {
    return NextResponse.json({ success: true, data: FALLBACK });
  }
}
