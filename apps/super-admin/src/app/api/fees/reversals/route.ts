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
      `SELECT rv.*, fp.receipt_number, fp.amount_paid, fp.payment_date,
              ${FEE_STUDENT_SELECT}
       FROM fee_reversals rv
       JOIN fee_payments fp ON fp.id = rv.payment_id
       JOIN students s ON s.id = rv.student_id
       ${FEE_STUDENT_FROM.replace('FROM students s', '')}
       ${where}
       ORDER BY rv.reversed_at DESC, rv.id DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing reversals:', error);
    return NextResponse.json({ success: false, error: 'Failed to load reversals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const paymentId = Number(body.payment_id);
    const reason = String(body.reason || '').trim();

    if (!paymentId || !reason) {
      return NextResponse.json({ success: false, error: 'Payment and reason are required' }, { status: 400 });
    }

    const payment = await auth.db.query<{
      id: number;
      student_id: number;
      amount_paid: string;
      status: string;
      student_fee_id: number | null;
      allocated_fee_ids: number[] | null;
      late_fee_charged: string | null;
      refunded_amount: string | null;
    }>(
      `SELECT id, student_id, amount_paid, status, student_fee_id, allocated_fee_ids, late_fee_charged, refunded_amount
       FROM fee_payments WHERE id = $1`,
      [paymentId]
    );
    const row = payment.rows[0];
    if (!row) {
      return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
    }
    if (row.status === 'reversed') {
      return NextResponse.json({ success: false, error: 'This receipt is already reversed' }, { status: 400 });
    }
    if (parseFloat(row.refunded_amount || '0') > 0) {
      return NextResponse.json({ success: false, error: 'Refunded receipts cannot be reversed' }, { status: 400 });
    }

    const feeIds = [
      ...(row.student_fee_id ? [row.student_fee_id] : []),
      ...(Array.isArray(row.allocated_fee_ids) ? row.allocated_fee_ids : []),
    ].filter((id, index, list) => list.indexOf(id) === index);

    const restoreAmount = parseFloat(row.amount_paid || '0');
    const lateFee = parseFloat(row.late_fee_charged || '0');
    if (feeIds.length === 1) {
      await restoreStudentFee(auth.db, feeIds[0], Math.max(0, restoreAmount - lateFee), lateFee);
    } else {
      let remaining = Math.max(0, restoreAmount - lateFee);
      for (const feeId of feeIds) {
        if (remaining <= 0) break;
        const fee = await auth.db.query<{ amount_paid: string }>(
          `SELECT amount_paid FROM student_fees WHERE id = $1`,
          [feeId]
        );
        const apply = Math.min(remaining, parseFloat(fee.rows[0]?.amount_paid || '0'));
        if (apply > 0) {
          await restoreStudentFee(auth.db, feeId, apply, 0);
          remaining -= apply;
        }
      }
    }

    await auth.db.query(
      `UPDATE fee_payments
       SET status = 'reversed', reversed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [paymentId]
    );

    const created = await auth.db.query(
      `INSERT INTO fee_reversals (payment_id, student_id, reason, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [paymentId, row.student_id, reason, auth.user.id]
    );

    return NextResponse.json({ success: true, data: created.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error reversing payment:', error);
    return NextResponse.json({ success: false, error: 'Failed to reverse receipt' }, { status: 500 });
  }
}
