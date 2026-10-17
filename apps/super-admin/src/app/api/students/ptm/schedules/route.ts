import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';
import { actorName, parseOptionalNumber } from '@/lib/student-operations-utils';
import { loadPtmForCalendar, syncPtmCalendarEvent, syncUnlinkedPtmSchedules } from '@/lib/ptm-calendar-sync';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);
    await syncUnlinkedPtmSchedules(auth.db);

    const academicYear = request.nextUrl.searchParams.get('academic_year') || '';
    const params: unknown[] = [];
    let where = '';
    if (academicYear) {
      where = 'WHERE p.academic_year = $1';
      params.push(academicYear);
    }

    const result = await auth.db.query(
      `SELECT p.*,
              to_char(p.scheduled_date, 'YYYY-MM-DD') AS scheduled_date,
              c.name AS class_name, sec.name AS section_name,
              (SELECT COUNT(*) FROM ptm_attendance a WHERE a.schedule_id = p.id AND a.parent_attended) AS present_count,
              (SELECT COUNT(*) FROM ptm_attendance a WHERE a.schedule_id = p.id) AS marked_count
       FROM ptm_schedules p
       LEFT JOIN classes c ON p.class_id = c.id
       LEFT JOIN sections sec ON p.section_id = sec.id
       ${where}
       ORDER BY p.scheduled_date DESC, p.id DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing PTM schedules:', error);
    return NextResponse.json({ success: false, error: 'Failed to load PTM schedules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);
    const body = await request.json();

    if (!body.title?.trim() || !body.scheduled_date) {
      return NextResponse.json({ success: false, error: 'Title and date are required' }, { status: 400 });
    }

    const result = await auth.db.query(
      `INSERT INTO ptm_schedules (
        academic_year, class_id, section_id, title, scheduled_date,
        start_time, end_time, venue, remarks, created_by, created_by_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        body.academic_year || null,
        parseOptionalNumber(body.class_id),
        parseOptionalNumber(body.section_id),
        body.title.trim(),
        body.scheduled_date,
        body.start_time || null,
        body.end_time || null,
        body.venue?.trim() || null,
        body.remarks?.trim() || null,
        auth.user.id,
        actorName(auth.user),
      ]
    );
    const linked = await loadPtmForCalendar(auth.db, result.rows[0].id);
    if (linked) await syncPtmCalendarEvent(auth.db);
    const saved = linked ? await loadPtmForCalendar(auth.db, result.rows[0].id) : result.rows[0];
    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error) {
    console.error('Error creating PTM schedule:', error);
    return NextResponse.json({ success: false, error: 'Failed to create PTM schedule' }, { status: 500 });
  }
}
