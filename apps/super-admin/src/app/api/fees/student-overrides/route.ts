import { NextRequest, NextResponse } from 'next/server';
import { requireFeeOps, studentFeeStatus } from '@/lib/fee-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;

    const studentId = request.nextUrl.searchParams.get('student_id');
    const academicYear = request.nextUrl.searchParams.get('academic_year') || '';
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'student_id is required' }, { status: 400 });
    }

    const fees = await auth.db.query(
      `SELECT sf.*, fs.fee_type, fs.frequency
       FROM student_fees sf
       LEFT JOIN fee_structures fs ON fs.id = sf.fee_structure_id
       WHERE sf.student_id = $1
         AND ($2 = '' OR sf.academic_year = $2)
       ORDER BY sf.due_date ASC NULLS LAST, sf.id`,
      [Number(studentId), academicYear]
    );

    return NextResponse.json({ success: true, data: fees.rows });
  } catch (error) {
    console.error('Error listing student fee overrides:', error);
    return NextResponse.json({ success: false, error: 'Failed to load student-wise fees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const studentFeeId = Number(body.student_fee_id);
    const amount = parseFloat(String(body.amount ?? ''));
    const discount = body.discount_amount != null ? parseFloat(String(body.discount_amount)) : null;
    const remarks = body.remarks != null ? String(body.remarks) : null;

    if (!studentFeeId || Number.isNaN(amount) || amount < 0) {
      return NextResponse.json({ success: false, error: 'Valid student fee and amount are required' }, { status: 400 });
    }

    const current = await auth.db.query<{
      student_id: number;
      academic_year: string;
      amount_paid: string;
      discount_amount: string | null;
      month: number | null;
    }>(
      `SELECT student_id, academic_year, amount_paid, discount_amount, month
       FROM student_fees WHERE id = $1`,
      [studentFeeId]
    );
    const fee = current.rows[0];
    if (!fee) {
      return NextResponse.json({ success: false, error: 'Student fee not found' }, { status: 404 });
    }

    const nextDiscount = discount != null && !Number.isNaN(discount) ? discount : parseFloat(fee.discount_amount || '0');
    const status = studentFeeStatus(amount, parseFloat(fee.amount_paid || '0'), nextDiscount);

    const updated = await auth.db.query(
      `UPDATE student_fees
       SET amount_due = $1,
           discount_amount = $2,
           remarks = COALESCE($3, remarks),
           status = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [amount, nextDiscount, remarks, status, studentFeeId]
    );

    await auth.db.query(
      `INSERT INTO fee_student_overrides (student_id, student_fee_id, academic_year, fee_type, month, amount, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        fee.student_id,
        studentFeeId,
        fee.academic_year,
        String(body.fee_type || 'Fee'),
        fee.month,
        amount,
        remarks,
      ]
    );

    return NextResponse.json({ success: true, data: updated.rows[0] });
  } catch (error) {
    console.error('Error saving student fee override:', error);
    return NextResponse.json({ success: false, error: 'Failed to save student-wise fee' }, { status: 500 });
  }
}
