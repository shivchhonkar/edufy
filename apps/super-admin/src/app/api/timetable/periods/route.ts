import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTimetableSchema } from '@/lib/ensure-timetable-schema';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTimetableSchema(db);

    const activeOnly = request.nextUrl.searchParams.get('active_only') === 'true';
    const result = await db.query(
      `SELECT * FROM timetable_periods
       ${activeOnly ? 'WHERE is_active = true' : ''}
       ORDER BY sort_order, start_time, id`
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Timetable periods fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch timetable periods' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTimetableSchema(db);
    const body = await request.json();
    const { name, start_time, end_time, sort_order } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Period name is required' },
        { status: 400 }
      );
    }

    let order = sort_order;
    if (order == null) {
      const maxResult = await db.query(
        'SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM timetable_periods'
      );
      order = (maxResult.rows[0] as { next_order: number }).next_order;
    }

    const result = await db.query(
      `INSERT INTO timetable_periods (name, start_time, end_time, sort_order, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [name.trim(), start_time || null, end_time || null, order]
    );

    return NextResponse.json(
      { success: true, data: result.rows[0], message: 'Period added successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Timetable period create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create period' },
      { status: 500 }
    );
  }
}
