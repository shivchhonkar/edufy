import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';
import { actorName } from '@/lib/student-operations-utils';
import { JOIN_CURRENT_ENROLLMENT_ON_STUDENT } from '@/lib/enrollment-sql';
import { prepareEnrollmentSchema } from '@/lib/enrollment-service';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);
    await prepareEnrollmentSchema(auth.db);

    const scheduleId = parseInt(request.nextUrl.searchParams.get('schedule_id') || '', 10);
    if (!scheduleId) {
      return NextResponse.json({ success: false, error: 'schedule_id is required' }, { status: 400 });
    }

    const schedule = await auth.db.query<{
      id: number;
      class_id: number | null;
      section_id: number | null;
    }>('SELECT id, class_id, section_id FROM ptm_schedules WHERE id = $1', [scheduleId]);
    if (!schedule.rows[0]) {
      return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 });
    }

    const { class_id, section_id } = schedule.rows[0];
    const conditions = [`s.status = 'active'`];
    const params: unknown[] = [scheduleId];
    let i = 2;
    if (class_id) {
      conditions.push(`COALESCE(ce.class_id, s.class_id) = $${i}`);
      params.push(class_id);
      i += 1;
    }
    if (section_id) {
      conditions.push(`COALESCE(ce.section_id, s.section_id) = $${i}`);
      params.push(section_id);
    }

    const result = await auth.db.query(
      `SELECT s.id AS student_id, s.first_name, s.last_name, s.admission_number,
              c.name AS class_name, sec.name AS section_name,
              a.id AS attendance_id, COALESCE(a.parent_attended, false) AS parent_attended,
              a.remarks
       FROM students s
       ${JOIN_CURRENT_ENROLLMENT_ON_STUDENT}
       LEFT JOIN classes c ON COALESCE(ce.class_id, s.class_id) = c.id
       LEFT JOIN sections sec ON COALESCE(ce.section_id, s.section_id) = sec.id
       LEFT JOIN ptm_attendance a ON a.student_id = s.id AND a.schedule_id = $1
       WHERE ${conditions.join(' AND ')}
       ORDER BY s.first_name, s.last_name`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error loading PTM attendance:', error);
    return NextResponse.json({ success: false, error: 'Failed to load PTM attendance' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    await ensureStudentOperationsSchema(auth.db);
    const body = await request.json();
    const scheduleId = parseInt(String(body.schedule_id), 10);
    const marks: Array<{ student_id: number; parent_attended: boolean; remarks?: string }> =
      Array.isArray(body.marks) ? body.marks : [];

    if (!scheduleId || marks.length === 0) {
      return NextResponse.json({ success: false, error: 'schedule_id and marks are required' }, { status: 400 });
    }

    for (const mark of marks) {
      await auth.db.query(
        `INSERT INTO ptm_attendance (schedule_id, student_id, parent_attended, remarks, marked_by, marked_by_name)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (schedule_id, student_id)
         DO UPDATE SET parent_attended = EXCLUDED.parent_attended,
                       remarks = EXCLUDED.remarks,
                       marked_by = EXCLUDED.marked_by,
                       marked_by_name = EXCLUDED.marked_by_name,
                       marked_at = CURRENT_TIMESTAMP`,
        [
          scheduleId,
          mark.student_id,
          Boolean(mark.parent_attended),
          mark.remarks?.trim() || null,
          auth.user.id,
          actorName(auth.user),
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving PTM attendance:', error);
    return NextResponse.json({ success: false, error: 'Failed to save PTM attendance' }, { status: 500 });
  }
}
