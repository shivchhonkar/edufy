import { NextRequest, NextResponse } from 'next/server';
import { hasRole } from '@edulakhya/auth';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureGatePassSchema } from '@/lib/ensure-gate-pass-schema';
import { GATE_PASS_APPROVER_ROLES } from '@/lib/gate-pass-utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db, user } = authResult;

    if (!hasRole(user.role || '', [...GATE_PASS_APPROVER_ROLES])) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only Principal (Super Admin) or authorized staff (Admin) can approve without OTP',
        },
        { status: 403 }
      );
    }

    await ensureGatePassSchema(db);

    const id = parseInt(params.id, 10);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const notes = body.notes ? String(body.notes).trim() : null;

    const passResult = await db.query<{ status: string }>(
      'SELECT status FROM student_gate_passes WHERE id = $1',
      [id]
    );
    if (!passResult.rows[0]) {
      return NextResponse.json({ success: false, error: 'Gate pass not found' }, { status: 404 });
    }
    if (passResult.rows[0].status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Gate pass is no longer pending' },
        { status: 400 }
      );
    }

    const approvalMethod = user.role === 'super_admin' ? 'principal' : 'authorized_staff';
    const approverName =
      (user as { full_name?: string }).full_name || user.email || `User #${user.id}`;
    const now = new Date();

    const updateResult = await db.query(
      `UPDATE student_gate_passes
       SET status = 'approved',
           approval_method = $1,
           approved_by_user_id = $2,
           approved_by_name = $3,
           approved_at = $4,
           exit_at = $4,
           notes = COALESCE($5, notes)
       WHERE id = $6
       RETURNING *`,
      [approvalMethod, user.id, approverName, now, notes, id]
    );

    return NextResponse.json({ success: true, data: updateResult.rows[0] });
  } catch (error) {
    console.error('Error approving gate pass:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to approve gate pass' },
      { status: 500 }
    );
  }
}
