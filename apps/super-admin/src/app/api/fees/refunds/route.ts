import { NextRequest, NextResponse } from 'next/server';
import {
  FEE_STUDENT_FROM,
  FEE_STUDENT_SELECT,
  requireFeeOps,
  restoreStudentFee,
} from '@/lib/fee-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    const academicYear = request.nextUrl.searchParams.get('academic_year') || '';
    const params: unknown[] = [];
    const conditions: string[] = [];
    if (academicYear) {
      params.push(academicYear);
      conditions.push(`fp.academic_year = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await auth.db.query(
      `SELECT r.*, fp.receipt_number, fp.amount_paid AS payment_amount, fp.payment_date,
              ${FEE_STUDENT_SELECT}
       FROM fee_refunds r
       JOIN fee_payments fp ON fp.id = r.payment_id
       JOIN students s ON s.id = r.student_id
       ${FEE_STUDENT_FROM.replace('FROM students s', '')}
       ${where}
       ORDER BY r.refund_date DESC, r.id DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing refunds:', error);
    return NextResponse.json({ success: false, error: 'Failed to load refunds' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const paymentId = Number(body.payment_id);
    const amount = parseFloat(String(body.amount ?? 0));
    const refundDate = String(body.refund_date || new Date().toISOString().slice(0, 10));
    const method = String(body.method || 'cash');
    const remarks = String(body.remarks || '').trim();

    if (!paymentId || !amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Payment and refund amount are required' }, { status: 400 });
    }

    const payment = await auth.db.query<{
      id: number;
      student_id: number;
      amount_paid: string;
      refunded_amount: string | null;
      status: string;
      student_fee_id: number | null;
      allocated_fee_ids: number[] | null;
      late_fee_charged: string | null;
    }>(
      `SELECT id, student_id, amount_paid, refunded_amount, status, student_fee_id, allocated_fee_ids, late_fee_charged
       FROM fee_payments WHERE id = $1`,
      [paymentId]
    );
    const row = payment.rows[0];
    if (!row) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }
    if (row.status === 'reversed') {
      return NextResponse.json({ success: false, error: 'Reversed receipts cannot be refunded' }, { status: 400 });
    }

    const already = parseFloat(row.refunded_amount || '0');
    const paid = parseFloat(row.amount_paid || '0');
    if (already + amount > paid + 0.009) {
      return NextResponse.json({ success: false, error: 'Refund exceeds the receipt amount' }, { status: 400 });
    }

    const feeIds = [
      ...(row.student_fee_id ? [row.student_fee_id] : []),
      ...(Array.isArray(row.allocated_fee_ids) ? row.allocated_fee_ids : []),
    ].filter((id, index, list) => list.indexOf(id) === index);

    let remaining = amount;
    for (const feeId of feeIds) {
      if (remaining <= 0) break;
      const fee = await auth.db.query<{ amount_paid: string }>(
        `SELECT amount_paid FROM student_fees WHERE id = $1`,
        [feeId]
      );
      const restore = Math.min(remaining, parseFloat(fee.rows[0]?.amount_paid || '0'));
      if (restore > 0) {
        await restoreStudentFee(auth.db, feeId, restore, 0);
        remaining -= restore;
      }
    }

    const nextRefunded = already + amount;
    const nextStatus = nextRefunded >= paid ? 'refunded' : row.status;

    await auth.db.query(
      `UPDATE fee_payments
       SET refunded_amount = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [nextRefunded, nextStatus, paymentId]
    );

    const created = await auth.db.query(
      `INSERT INTO fee_refunds (payment_id, student_id, amount, refund_date, method, remarks, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [paymentId, row.student_id, amount, refundDate, method, remarks || null, auth.user.id]
    );

    return NextResponse.json({ success: true, data: created.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating refund:', error);
    return NextResponse.json({ success: false, error: 'Failed to record refund' }, { status: 500 });
  }
}
