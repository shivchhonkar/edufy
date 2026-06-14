import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTimetableSchema } from '@/lib/ensure-timetable-schema';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTimetableSchema(db);
    const body = await request.json();
    const { name, start_time, end_time, sort_order, is_active } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Period name is required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE timetable_periods SET
        name = $1,
        start_time = $2,
        end_time = $3,
        sort_order = COALESCE($4, sort_order),
        is_active = COALESCE($5, is_active)
       WHERE id = $6
       RETURNING *`,
      [
        name.trim(),
        start_time || null,
        end_time || null,
        sort_order ?? null,
        is_active ?? null,
        params.id,
      ]
    );

    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Period not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0], message: 'Period updated' });
  } catch (error) {
    console.error('Timetable period update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update period' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTimetableSchema(db);

    const inUse = await db.query(
      'SELECT COUNT(*)::int AS count FROM class_timetable WHERE period_id = $1',
      [params.id]
    );
    const count = (inUse.rows[0] as { count: number }).count;
    if (count > 0) {
      await db.query('UPDATE timetable_periods SET is_active = false WHERE id = $1', [params.id]);
      return NextResponse.json({
        success: true,
        message: 'Period deactivated (used in existing timetable entries)',
      });
    }

    await db.query('DELETE FROM timetable_periods WHERE id = $1', [params.id]);
    return NextResponse.json({ success: true, message: 'Period deleted' });
  } catch (error) {
    console.error('Timetable period delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete period' }, { status: 500 });
  }
}
