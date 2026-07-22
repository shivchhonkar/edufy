import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireTeacherAuth, resolveStaffId, ensureTeacherSchema } from '@/lib/teacher-auth';
import { fetchAllCalendarEvents, fetchCalendarEventsInRange } from '@/lib/parent-portal/school-calendar';

export async function GET(request: NextRequest) {
  try {
    const auth = requireTeacherAuth(request);
    if (auth instanceof NextResponse) return auth;

    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    await ensureTeacherSchema(db);

    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get('scope');

    if (scope === 'all') {
      const data = await fetchAllCalendarEvents(db, { staffVisibleOnly: true });
      return NextResponse.json({ success: true, data });
    }

    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!year || !month) {
      return NextResponse.json(
        { success: false, error: 'year and month are required' },
        { status: 400 },
      );
    }

    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      return NextResponse.json({ success: false, error: 'Invalid year or month' }, { status: 400 });
    }

    const rangeStart = `${y}-${String(m).padStart(2, '0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const rangeEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const data = await fetchCalendarEventsInRange(db, rangeStart, rangeEnd, {
      staffVisibleOnly: true,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Teacher calendar events error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar events' },
      { status: 500 },
    );
  }
}
