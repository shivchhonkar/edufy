import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api';
import { loadPaymentReceiptData } from '@/lib/fees/load-payment-receipt-data';
import { loadReceiptSchoolSettings } from '@/lib/fees/load-receipt-school-settings';
import {
  buildFeeReceiptPreviewDocument,
  type FeeReceiptPayment,
  type FeeReceiptStudent,
} from '@/features/fees/utils/fee-receipt-print';

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

    const data = await loadPaymentReceiptData(db, receiptId);
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 },
      );
    }

    const paymentStudentId = Number(data.student.id);
    if (!Number.isFinite(paymentStudentId) || paymentStudentId !== studentId) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 },
      );
    }

    const basicResult = await db.query(
      `SELECT id, receipt_number, payment_method, payment_date, amount_paid, transaction_id,
              remarks, academic_year, late_fee_charged, discount_applied, status
       FROM fee_payments
       WHERE id = $1 AND student_id = $2 AND status = 'completed'`,
      [receiptId, studentId],
    );

    if (basicResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 },
      );
    }

    const origin = request.nextUrl.origin;
    const settings = await loadReceiptSchoolSettings(db, origin);
    const payment = data.payment as FeeReceiptPayment;
    const student = data.student as FeeReceiptStudent;
    const html = buildFeeReceiptPreviewDocument(payment, student, {
      ...settings,
      academic_year: settings.academic_year || String(payment.academic_year || ''),
    });

    return NextResponse.json({
      success: true,
      data: {
        receipt: basicResult.rows[0],
        payment: data.payment,
        student: data.student,
        settings,
        html,
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
