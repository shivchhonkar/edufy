import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import {
  insertHoliday,
  insertHolidaysForClasses,
  listHolidays,
  type HolidayInput,
} from '@/lib/holiday-service';
import type { HolidayScope } from '@/lib/holiday-utils';

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseClassIds(body: HolidayInput & { class_ids?: unknown }): number[] {
  if (Array.isArray(body.class_ids)) {
    return body.class_ids
      .map((id) => parseInt(String(id), 10))
      .filter((id) => Number.isFinite(id) && id > 0);
  }
  const single = parsePositiveInt(body.class_id == null ? null : String(body.class_id));
  return single ? [single] : [];
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const scopeParam = searchParams.get('scope');
    const scope: HolidayScope | null =
      scopeParam === 'class' || scopeParam === 'school' ? scopeParam : null;

    const data = await listHolidays(db, {
      academicYear: searchParams.get('academic_year'),
      classId: parsePositiveInt(searchParams.get('class_id')),
      studentId: parsePositiveInt(searchParams.get('student_id')),
      scope,
      startDate: searchParams.get('start_date'),
      endDate: searchParams.get('end_date'),
      year: searchParams.get('year'),
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch holidays' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = (await request.json()) as HolidayInput & { class_ids?: unknown };
    const classIds = body.scope === 'class' ? parseClassIds(body) : [];

    if (body.scope === 'class' && classIds.length > 1) {
      const created = await insertHolidaysForClasses(db, body, classIds);
      if ('error' in created) {
        return NextResponse.json({ success: false, error: created.error }, { status: 400 });
      }
      return NextResponse.json(
        { success: true, data: created, message: 'Holiday created successfully' },
        { status: 201 },
      );
    }

    if (body.scope === 'class' && classIds.length === 1) {
      body.class_id = classIds[0];
    }

    const created = await insertHoliday(db, body);
    if ('error' in created) {
      return NextResponse.json({ success: false, error: created.error }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, data: created, message: 'Holiday created successfully' },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating holiday:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create holiday' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Holiday ID is required' }, { status: 400 });
    }

    await db.query('DELETE FROM holidays WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Holiday deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete holiday' },
      { status: 500 },
    );
  }
}
