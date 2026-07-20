import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    const receiptId = parseInt(params.id, 10);
    if (!Number.isFinite(receiptId) || receiptId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid receipt id' },
        { status: 400 },
      );
    }

    const result = await db.query(
      `SELECT
         fp.id,
         fp.receipt_number,
         fp.payment_method,
         fp.payment_date,
         fp.amount_paid,
         fp.transaction_id,
         fp.remarks,
         fp.academic_year,
         fp.late_fee_charged,
         fp.discount_applied
       FROM fee_payments fp
       WHERE fp.id = $1
         AND fp.student_id = $2
         AND fp.status = 'completed'`,
      [receiptId, studentId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        receipt: result.rows[0],
      },
    });
  } catch (error) {
    console.error('Error fetching parent fee receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee receipt' },
      { status: 500 },
    );
  }
}
