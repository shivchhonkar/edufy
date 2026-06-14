import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin } from '@/lib/hr-auth';

async function isPeriodFrozen(
  db: Awaited<ReturnType<typeof getRequestDb>>['db'],
  month: number,
  year: number
): Promise<boolean> {
  const run = await db.query(
    'SELECT is_frozen FROM payroll_runs WHERE month = $1 AND year = $2',
    [month, year]
  );
  return !!run.rows[0]?.is_frozen;
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

    const existing = await db.query('SELECT * FROM payroll WHERE id = $1', [params.id]);
    if (!existing.rows.length) {
      return NextResponse.json({ success: false, error: 'Payroll record not found' }, { status: 404 });
    }

    const row = existing.rows[0] as { month: number; year: number; status: string };
    const body = await request.json();
    const { action, payment_method, transaction_id, remarks, is_advance } = body;

    if (action === 'mark_paid') {
      if (await isPeriodFrozen(db, row.month, row.year)) {
        return NextResponse.json(
          { success: false, error: 'This payroll period is frozen. Unfreeze to make changes.' },
          { status: 400 }
        );
      }
      if (row.status === 'paid') {
        return NextResponse.json({ success: false, error: 'Already marked as paid' }, { status: 400 });
      }

      const result = await db.query(
        `UPDATE payroll SET
          status = 'paid',
          amount_paid = net_salary,
          payment_date = CURRENT_DATE,
          paid_at = CURRENT_TIMESTAMP,
          payment_method = COALESCE($1, payment_method),
          transaction_id = COALESCE($2, transaction_id),
          remarks = COALESCE($3, remarks),
          is_advance = COALESCE($4, is_advance, false)
        WHERE id = $5 RETURNING *`,
        [payment_method || null, transaction_id || null, remarks || null, is_advance ?? false, params.id]
      );
      return NextResponse.json({ success: true, data: result.rows[0], message: 'Payment recorded' });
    }

    if (action === 'mark_unpaid') {
      if (await isPeriodFrozen(db, row.month, row.year)) {
        return NextResponse.json(
          { success: false, error: 'This payroll period is frozen. Unfreeze to make changes.' },
          { status: 400 }
        );
      }
      const result = await db.query(
        `UPDATE payroll SET status = 'pending', amount_paid = 0, payment_date = NULL, paid_at = NULL,
          payment_method = NULL, transaction_id = NULL, is_advance = false
        WHERE id = $1 RETURNING *`,
        [params.id]
      );
      return NextResponse.json({ success: true, data: result.rows[0], message: 'Reverted to pending' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Payroll update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update payroll' }, { status: 500 });
  }
}
