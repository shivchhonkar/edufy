import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';
import { parseOptionalNumber } from '@/lib/student-operations-utils';
import { loadPtmForCalendar, removePtmCalendarEvent, syncPtmCalendarEvent } from '@/lib/ptm-calendar-sync';

function parseId(id: string) {
  const value = parseInt(id, 10);
  return Number.isFinite(value) ? value : null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    await ensureStudentOperationsSchema(auth.db);
    const body = await request.json();

    if (body.action === 'cancel') {
      const existing = await loadPtmForCalendar(auth.db, id);
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
      }
      await auth.db.query(
        `UPDATE ptm_schedules SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );
      await syncPtmCalendarEvent(auth.db);
      const cancelled = await loadPtmForCalendar(auth.db, id);
      return NextResponse.json({ success: true, data: cancelled });
    }

    const result = await auth.db.query(
      `UPDATE ptm_schedules SET
        academic_year = $1,
        class_id = $2,
        section_id = $3,
        title = COALESCE($4, title),
        scheduled_date = COALESCE($5, scheduled_date),
        start_time = $6,
        end_time = $7,
        venue = $8,
        remarks = $9,
        status = 'scheduled',
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        body.academic_year || null,
        parseOptionalNumber(body.class_id),
        parseOptionalNumber(body.section_id),
        body.title?.trim() || null,
        body.scheduled_date || null,
        body.start_time || null,
        body.end_time || null,
        body.venue?.trim() || null,
        body.remarks?.trim() || null,
        id,
      ]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
    }
    const linked = await loadPtmForCalendar(auth.db, id);
    if (linked) await syncPtmCalendarEvent(auth.db);
    return NextResponse.json({ success: true, data: linked || result.rows[0] });
  } catch (error) {
    console.error('Error updating PTM schedule:', error);
    return NextResponse.json({ success: false, error: 'Failed to update PTM schedule' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    await ensureStudentOperationsSchema(auth.db);
    const existing = await loadPtmForCalendar(auth.db, id);
    await removePtmCalendarEvent(auth.db, existing?.calendar_event_id);
    await auth.db.query('DELETE FROM ptm_schedules WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PTM schedule:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete PTM schedule' }, { status: 500 });
  }
}
