import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureAcademicCalendarSchema } from '@/lib/ensure-academic-calendar-schema';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureAcademicCalendarSchema(db);
    const searchParams = request.nextUrl.searchParams;
    const sourceKind = searchParams.get('source_kind');
    const body = await request.json();

    if (sourceKind === 'holiday') {
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

    if (sourceKind === 'term_date') {
      const { academic_year, term_name, term_number, start_date, end_date, description } = body;
      if (!academic_year || !term_name || !start_date || !end_date) {
        return NextResponse.json(
          { success: false, error: 'Academic year, term name, and dates are required' },
          { status: 400 },
        );
      }

      const result = await db.query(
        `UPDATE academic_term_dates SET
          academic_year = $1,
          term_name = $2,
          term_number = $3,
          start_date = $4,
          end_date = $5,
          description = $6,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [
          academic_year,
          term_name,
          term_number ?? null,
          start_date,
          end_date,
          description || null,
          params.id,
        ],
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Term date not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, data: result.rows[0] });
    }

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
    console.error('Error updating academic calendar entry:', error);
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
    await ensureAcademicCalendarSchema(db);
    const sourceKind = request.nextUrl.searchParams.get('source_kind');

    if (sourceKind === 'holiday') {
      await db.query('DELETE FROM holidays WHERE id = $1', [params.id]);
      return NextResponse.json({ success: true, message: 'Holiday deleted' });
    }

    if (sourceKind === 'term_date') {
      const result = await db.query('DELETE FROM academic_term_dates WHERE id = $1 RETURNING id', [
        params.id,
      ]);
      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Term date not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: 'Term date deleted' });
    }

    const result = await db.query('DELETE FROM school_events WHERE id = $1 RETURNING id', [
      params.id,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    console.error('Error deleting academic calendar entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete calendar entry' },
      { status: 500 },
    );
  }
}
