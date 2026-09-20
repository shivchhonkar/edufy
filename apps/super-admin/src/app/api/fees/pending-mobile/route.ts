import { NextRequest, NextResponse } from 'next/server';
import { ensurePaymentSettings } from '@/lib/ensure-payment-settings';
import { FEE_STUDENT_FROM, FEE_STUDENT_SELECT, requireFeeOps } from '@/lib/fee-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    await ensurePaymentSettings(auth.db);

    const status = request.nextUrl.searchParams.get('status') || 'pending';
    const result = await auth.db.query(
      `SELECT o.*, ${FEE_STUDENT_SELECT}
       FROM fee_payment_orders o
       JOIN students s ON s.id = o.student_id
       ${FEE_STUDENT_FROM.replace('FROM students s', '')}
       WHERE o.status = $1
       ORDER BY o.created_at DESC`,
      [status]
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing pending mobile receipts:', error);
    return NextResponse.json({ success: false, error: 'Failed to load pending mobile receipts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    await ensurePaymentSettings(auth.db);
    const body = await request.json();
    const id = Number(body.id);
    const action = String(body.action || 'cancel');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Order id is required' }, { status: 400 });
    }

    if (action !== 'cancel') {
      return NextResponse.json({ success: false, error: 'Only cancel is supported for pending mobile orders' }, { status: 400 });
    }

    const result = await auth.db.query(
      `UPDATE fee_payment_orders
       SET status = 'cancelled'
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Pending order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating pending mobile receipt:', error);
    return NextResponse.json({ success: false, error: 'Failed to update pending mobile receipt' }, { status: 500 });
  }
}
