import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTeacherPedagogySchema } from '@/lib/ensure-teacher-pedagogy-schema';
import { requireHrAdmin } from '@/lib/hr-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureTeacherPedagogySchema(db);

    const body = await request.json();
    const result = await db.query(
      `UPDATE teacher_daily_activities SET
        staff_id = COALESCE($1, staff_id),
        class_id = COALESCE($2, class_id),
        section_id = COALESCE($3, section_id),
        subject_id = COALESCE($4, subject_id),
        activity_date = COALESCE($5, activity_date),
        topic_covered = COALESCE($6, topic_covered),
        periods_taught = COALESCE($7, periods_taught),
        homework_given = COALESCE($8, homework_given),
        remarks = COALESCE($9, remarks),
        status = COALESCE($10, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 RETURNING *`,
      [
        body.staff_id,
        body.class_id,
        body.section_id,
        body.subject_id,
        body.activity_date,
        body.topic_covered?.trim(),
        body.periods_taught,
        body.homework_given,
        body.remarks?.trim(),
        body.status,
        params.id,
      ]
    );
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Activity not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update activity' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    const result = await db.query('DELETE FROM teacher_daily_activities WHERE id = $1 RETURNING id', [params.id]);
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Activity not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Activity deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete activity' }, { status: 500 });
  }
}
