import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { getPaymentReceiptByPaymentId } from '@/lib/payment-receipts';

function parseMonthsFromRemarks(remarks: unknown): string[] {
  const text = String(remarks || '');
  if (!text) return [];
  const match = text.match(/months?:\s*([A-Za-z,\s-]+)/i);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean)
    .map((m) => m.replace(/\./g, ''));
}

// GET tuition-only receipt for a payment
export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const paymentId = params.paymentId;

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Try to get payment receipt from the new payment_receipts table first
    const receiptResult = await getPaymentReceiptByPaymentId(parseInt(paymentId));
    
    if (receiptResult.success) {
      // Use the detailed payment receipt data
      const receiptData = receiptResult.data;
      
      // Create tuition-only fee breakdown
      const feeBreakdown = receiptData.selected_months.map((monthName: string) => ({
        fee_type: 'Tuition Fee',
        month: monthName,
        year: receiptData.academic_year,
        amount: receiptData.tuition_fees_per_month,
        late_fee: 0
      }));

      const tuitionPayment = {
        id: receiptData.payment_id,
        receipt_number: `${receiptData.receipt_number}-TUITION`,
        payment_date: receiptData.payment_date,
        payment_method: receiptData.payment_method,
        transaction_id: receiptData.transaction_id,
        amount_paid: receiptData.total_tuition_paid,
        late_fee_charged: 0,
        discount_applied: 0,
        academic_year: receiptData.academic_year,
        fee_breakdown: feeBreakdown,
        months_paid: receiptData.months_count,
        is_tuition_only: true
      };

      return NextResponse.json({
        success: true,
        data: {
          payment: tuitionPayment,
          student: {
            id: receiptData.student_id,
            first_name: receiptData.first_name,
            last_name: receiptData.last_name,
            admission_number: receiptData.admission_number,
            parent_name: receiptData.parent_name,
            parent_phone: receiptData.parent_phone,
            parent_email: receiptData.parent_email,
            class_name: receiptData.class_name,
            section_name: receiptData.section_name,
          },
        },
      });
    }

    // Fallback to old method if payment receipt not found
    const result = await db.query(
      `SELECT 
        fp.*,
        s.id as student_id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.parent_name,
        s.parent_phone,
        s.parent_email,
        c.name as class_name,
        sec.name as section_name,
        fs.fee_type,
        fc.name as category_name
       FROM fee_payments fp
       JOIN students s ON fp.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN fee_structures fs ON fp.fee_structure_id = fs.id
       LEFT JOIN fee_categories fc ON fs.category_id = fc.id
       WHERE fp.id = $1`,
      [paymentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 }
      );
    }

    const receiptData = result.rows[0];

    // Fallback tuition-only payment
    const paymentDate = new Date(receiptData.payment_date);
    const monthFromFee = receiptData.month || (paymentDate.getMonth() + 1);
    const monthNameFromFee = monthFromFee
      ? new Date(2000, Number(monthFromFee) - 1, 1).toLocaleString('en-IN', { month: 'long' })
      : '';
    const fallbackMonths = monthNameFromFee ? [monthNameFromFee] : parseMonthsFromRemarks(receiptData.remarks);
    const baseYear = String(receiptData.academic_year || paymentDate.getFullYear());
    const feeBreakdown = [{
      fee_type: 'Tuition Fee',
      month: fallbackMonths[0] || monthFromFee,
      year: baseYear,
      amount: parseFloat(receiptData.amount_paid) - parseFloat(receiptData.late_fee_charged || 0),
      late_fee: 0
    }];

    // Expand months if present in remarks for bulk payment fallback
    const expandedFeeBreakdown = fallbackMonths.length > 1
      ? fallbackMonths.map((monthName) => ({
          fee_type: 'Tuition Fee',
          month: monthName,
          year: baseYear,
          amount: (parseFloat(receiptData.amount_paid) - parseFloat(receiptData.late_fee_charged || 0)) / fallbackMonths.length,
          late_fee: 0,
        }))
      : feeBreakdown;

    const tuitionPayment = {
      ...receiptData,
      receipt_number: `${receiptData.receipt_number}-TUITION`,
      amount_paid: parseFloat(receiptData.amount_paid) - parseFloat(receiptData.late_fee_charged || 0),
      fee_breakdown: expandedFeeBreakdown,
      months_paid: expandedFeeBreakdown.length,
      is_tuition_only: true
    };

    return NextResponse.json({
      success: true,
      data: {
        payment: tuitionPayment,
        student: {
          id: receiptData.student_id,
          first_name: receiptData.first_name,
          last_name: receiptData.last_name,
          admission_number: receiptData.admission_number,
          parent_name: receiptData.parent_name,
          parent_phone: receiptData.parent_phone,
          parent_email: receiptData.parent_email,
          class_name: receiptData.class_name,
          section_name: receiptData.section_name,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching tuition-only receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tuition receipt' },
      { status: 500 }
    );
  }
}
