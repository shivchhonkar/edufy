import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin } from '@/lib/hr-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const { action, exit_notes, clearance_status } = await request.json();
    const resignation = await db.query('SELECT * FROM resignations WHERE id = $1', [params.id]);
    if (!resignation.rows.length) {
      return NextResponse.json({ success: false, error: 'Resignation not found' }, { status: 404 });
    }

    const row = resignation.rows[0] as { staff_id: number; status: string };

    if (action === 'approve') {
      await db.query(
        `UPDATE resignations SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [auth.user.id, params.id]
      );
      await db.query(
        `UPDATE staff SET status = 'resigned', status_change_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [row.staff_id]
      );
    } else if (action === 'reject') {
      await db.query(
        `UPDATE resignations SET status = 'rejected', approved_by = $1, approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [auth.user.id, params.id]
      );
    } else if (action === 'clearance') {
      await db.query(
        `UPDATE resignations SET clearance_status = $1, exit_notes = COALESCE($2, exit_notes),
          status = CASE WHEN $1 = 'completed' THEN 'cleared' ELSE status END,
          updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [clearance_status || 'in_progress', exit_notes, params.id]
      );
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const updated = await db.query('SELECT * FROM resignations WHERE id = $1', [params.id]);
    return NextResponse.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update resignation' }, { status: 500 });
  }
}
