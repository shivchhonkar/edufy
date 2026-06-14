import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin, requireHrRead, getStaffIdForUser } from '@/lib/hr-auth';

async function syncLeaveToAttendance(
  db: Awaited<ReturnType<typeof getRequestDb>>['db'],
  staffId: number,
  startDate: string,
  endDate: string
) {
  const cur = new Date(startDate);
  const end = new Date(endDate);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      const dateStr = cur.toISOString().split('T')[0];
      await db.query(
        `INSERT INTO staff_attendance (staff_id, attendance_date, status, attendance_type, remarks)
         VALUES ($1, $2, 'on_leave', 'manual', 'Auto-marked from approved leave')
         ON CONFLICT (staff_id, attendance_date)
         DO UPDATE SET status = 'on_leave', updated_at = CURRENT_TIMESTAMP`,
        [staffId, dateStr]
      );
    }
    cur.setDate(cur.getDate() + 1);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const { action, remarks } = await request.json();
    if (!['approve', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const leave = await db.query('SELECT * FROM staff_leaves WHERE id = $1', [params.id]);
    if (!leave.rows.length) {
      return NextResponse.json({ success: false, error: 'Leave not found' }, { status: 404 });
    }

    const row = leave.rows[0] as {
      staff_id: number; leave_type_id: number; start_date: string; end_date: string;
      days_requested: number; status: string;
    };

    const statusMap = { approve: 'approved', reject: 'rejected', cancel: 'cancelled' };
    const newStatus = statusMap[action as keyof typeof statusMap];

    const approverStaffId = await getStaffIdForUser(db, auth.user.id);

    const result = await db.query(
      `UPDATE staff_leaves SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP,
        remarks = COALESCE($3, remarks), updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [newStatus, approverStaffId, remarks || null, params.id]
    );

    if (action === 'approve') {
      const year = new Date(row.start_date).getFullYear();
      await db.query(
        `INSERT INTO leave_balances (staff_id, leave_type_id, year, allocated, used)
         VALUES ($1, $2, $3, 0, $4)
         ON CONFLICT (staff_id, leave_type_id, year)
         DO UPDATE SET used = leave_balances.used + $4`,
        [row.staff_id, row.leave_type_id, year, row.days_requested]
      );
      await syncLeaveToAttendance(db, row.staff_id, row.start_date, row.end_date);
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Leave action error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update leave' }, { status: 500 });
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
    const result = await db.query(
      `DELETE FROM staff_leaves WHERE id = $1 AND status = 'pending' RETURNING id`,
      [params.id]
    );
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Leave not found or not pending' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Leave request deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete leave' }, { status: 500 });
  }
}
