import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureSchoolEventsSchema } from '@/lib/ensure-school-events-schema';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const kind = searchParams.get('kind');
    const body = await request.json();

    if (kind === 'holiday') {
      const { date, name, type, description } = body;
      if (!date || !name || !type) {
        return NextResponse.json(
          { success: false, error: 'Date, name, and type are required' },
          { status: 400 },
        );
      }

      const result = await db.query(
        `UPDATE holidays SET date = $1, name = $2, type = $3, description = $4
         WHERE id = $5 RETURNING *`,
        [date, name, type, description || null, params.id],
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Holiday not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: result.rows[0] });
    }

    await ensureSchoolEventsSchema(db);
    const {
      title,
      description,
      event_type,
      start_date,
      end_date,
      all_day,
      start_time,
      end_time,
      location,
      audience,
      status,
    } = body;

    const result = await db.query(
      `UPDATE school_events SET
        title = COALESCE($1, title),
        description = $2,
        event_type = COALESCE($3, event_type),
        start_date = COALESCE($4, start_date),
        end_date = COALESCE($5, end_date),
        all_day = COALESCE($6, all_day),
        start_time = $7,
        end_time = $8,
        location = $9,
        audience = COALESCE($10, audience),
        status = COALESCE($11, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *`,
      [
        title,
        description ?? null,
        event_type,
        start_date,
        end_date,
        all_day,
        start_time ?? null,
        end_time ?? null,
        location ?? null,
        audience,
        status,
        params.id,
      ],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating calendar entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update calendar entry' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const kind = searchParams.get('kind');

    if (kind === 'holiday') {
      await db.query('DELETE FROM holidays WHERE id = $1', [params.id]);
      return NextResponse.json({ success: true, message: 'Holiday deleted successfully' });
    }

    await ensureSchoolEventsSchema(db);
    const result = await db.query('DELETE FROM school_events WHERE id = $1 RETURNING id', [
      params.id,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting calendar entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete calendar entry' },
      { status: 500 },
    );
  }
}
