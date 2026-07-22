import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireTeacherAuth, resolveStaffId, ensureTeacherSchema } from '@/lib/teacher-auth';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = requireTeacherAuth(request);
    if (auth instanceof NextResponse) return auth;

    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    await ensureTeacherSchema(db);
    await ensureHrSchema(db);

    const staffId = await resolveStaffId(db, auth.user.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const leaveId = parseInt(params.id, 10);
    if (!Number.isFinite(leaveId)) {
      return NextResponse.json({ success: false, error: 'Invalid leave id' }, { status: 400 });
    }

    const body = await request.json();
    if (String(body?.action ?? '') !== 'cancel') {
      return NextResponse.json({ success: false, error: 'Only cancel action is supported' }, { status: 400 });
    }

    const existing = await db.query(
      'SELECT id, status, staff_id FROM staff_leaves WHERE id = $1',
      [leaveId],
    );
    if (!existing.rows.length) {
      return NextResponse.json({ success: false, error: 'Leave request not found' }, { status: 404 });
    }

    const row = existing.rows[0];
    if (Number(row.staff_id) !== staffId) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    if (row.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Only pending leave requests can be cancelled' },
        { status: 400 },
      );
    }

    const result = await db.query(
      `UPDATE staff_leaves
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [leaveId],
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Leave request cancelled',
    });
  } catch (error) {
    console.error('Teacher leave cancel error:', error);
    return NextResponse.json({ success: false, error: 'Failed to cancel leave request' }, { status: 500 });
  }
}
