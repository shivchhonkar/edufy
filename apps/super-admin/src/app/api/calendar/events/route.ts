import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureSchoolEventsSchema } from '@/lib/ensure-school-events-schema';
import { fetchAllCalendarEvents, fetchCalendarEventsInRange } from '@/lib/school-calendar';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get('scope');

    if (scope === 'all') {
      const data = await fetchAllCalendarEvents(db);
      return NextResponse.json({ success: true, data });
    }

    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let rangeStart = startDate;
    let rangeEnd = endDate;

    if (year && month) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
        return NextResponse.json(
          { success: false, error: 'Invalid year or month' },
          { status: 400 },
        );
      }
      rangeStart = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      rangeEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    }

    if (!rangeStart || !rangeEnd) {
      return NextResponse.json(
        { success: false, error: 'start_date and end_date are required' },
        { status: 400 },
      );
    }

    const data = await fetchCalendarEventsInRange(db, rangeStart, rangeEnd);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar events' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureSchoolEventsSchema(db);
    const body = await request.json();
    const kind = body.kind as string;

    if (kind === 'holiday') {
      const { date, name, type, description } = body;
      if (!date || !name || !type) {
        return NextResponse.json(
          { success: false, error: 'Date, name, and type are required for holidays' },
          { status: 400 },
        );
      }

      const result = await db.query(
        `INSERT INTO holidays (date, name, type, description)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [date, name, type, description || null],
      );

      return NextResponse.json(
        { success: true, data: result.rows[0], message: 'Holiday created successfully' },
        { status: 201 },
      );
    }

    const {
      title,
      description,
      event_type = 'event',
      start_date,
      end_date,
      all_day = true,
      start_time,
      end_time,
      location,
      audience = 'parents',
      status = 'published',
    } = body;

    if (!title || !start_date) {
      return NextResponse.json(
        { success: false, error: 'Title and start date are required' },
        { status: 400 },
      );
    }

    const result = await db.query(
      `INSERT INTO school_events (
        title, description, event_type, start_date, end_date,
        all_day, start_time, end_time, location, audience, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        title,
        description || null,
        event_type,
        start_date,
        end_date || start_date,
        all_day,
        start_time || null,
        end_time || null,
        location || null,
        audience,
        status,
      ],
    );

    return NextResponse.json(
      { success: true, data: result.rows[0], message: 'Event created successfully' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating calendar entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create calendar entry' },
      { status: 500 },
    );
  }
}
