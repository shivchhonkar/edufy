import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureAcademicCalendarSchema } from '@/lib/ensure-academic-calendar-schema';
import {
  fetchAcademicCalendarEntries,
  type AcademicCalendarCategory,
} from '@/lib/academic-calendar';

const VALID_CATEGORIES = new Set<AcademicCalendarCategory>([
  'all',
  'holiday',
  'exam',
  'ptm',
  'event',
  'term_date',
]);

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const categoryParam = (searchParams.get('category') || 'all') as AcademicCalendarCategory;
    const category = VALID_CATEGORIES.has(categoryParam) ? categoryParam : 'all';

    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;
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

    const data = await fetchAcademicCalendarEntries(db, {
      category,
      startDate: rangeStart,
      endDate: rangeEnd,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching academic calendar:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch academic calendar' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureAcademicCalendarSchema(db);
    const body = await request.json();
    const category = body.category as string;

    if (category === 'holiday') {
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

      return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
    }

    if (category === 'term_date') {
      const { academic_year, term_name, term_number, start_date, end_date, description } = body;
      if (!academic_year || !term_name || !start_date || !end_date) {
        return NextResponse.json(
          {
            success: false,
            error: 'Academic year, term name, start date, and end date are required',
          },
          { status: 400 },
        );
      }

      const result = await db.query(
        `INSERT INTO academic_term_dates (
          academic_year, term_name, term_number, start_date, end_date, description
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          academic_year,
          term_name,
          term_number ?? null,
          start_date,
          end_date,
          description || null,
        ],
      );

      return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
    }

    const eventTypeMap: Record<string, string> = {
      exam: 'exam',
      ptm: 'ptm',
      event: 'event',
    };
    const event_type = eventTypeMap[category] || body.event_type || 'event';

    const {
      title,
      description,
      start_date,
      end_date,
      all_day = true,
      start_time,
      end_time,
      location,
      audience = 'all',
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

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating academic calendar entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create calendar entry' },
      { status: 500 },
    );
  }
}
