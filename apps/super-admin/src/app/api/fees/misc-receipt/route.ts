import { NextRequest, NextResponse } from 'next/server';
import { allocateToOldestDues, requireFeeOps } from '@/lib/fee-operations-utils';
import { generateNextReceiptNumber } from '@/lib/fees/ReceiptNumberService';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();

    const studentId = Number(body.student_id);
    const amount = parseFloat(String(body.amount_paid ?? body.amount ?? 0));
    const paymentDate = String(body.payment_date || '').trim();
    const paymentMethod = String(body.payment_method || 'cash').toLowerCase();
    const academicYear = String(body.academic_year || '').trim();
    const feeHead = String(body.fee_head || 'Other Charges').trim();
    const remarks = String(body.remarks || '').trim();
    const discount = parseFloat(String(body.discount_applied ?? 0)) || 0;
    const allocate = body.allocate !== false;

    if (!studentId || !amount || amount <= 0 || !paymentDate || !academicYear) {
      return NextResponse.json(
        { success: false, error: 'Student, amount, payment date, and academic year are required' },
        { status: 400 }
      );
    }

    const receiptNumber = await generateNextReceiptNumber(auth.db, academicYear, body.series_prefix);
    const allocated = allocate
      ? await allocateToOldestDues(auth.db, studentId, academicYear, amount)
      : [];

    const result = await auth.db.query(
      `INSERT INTO fee_payments (
         student_id, amount_paid, payment_date, payment_method, transaction_id,
         receipt_number, status, remarks, created_by, discount_applied, academic_year,
         is_misc, allocated_fee_ids, payment_source
       ) VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7, $8, $9, $10, true, $11, 'misc')
       RETURNING *`,
      [
        studentId,
        amount,
        paymentDate,
        paymentMethod,
        body.transaction_id || null,
        receiptNumber,
        remarks || `Misc fee: ${feeHead}`,
        auth.user.id,
        discount,
        academicYear,
        allocated,
      ]
    );

    return NextResponse.json(
      { success: true, data: result.rows[0], message: 'Miscellaneous receipt recorded' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating misc receipt:', error);
    return NextResponse.json({ success: false, error: 'Failed to record miscellaneous receipt' }, { status: 500 });
  }
}
