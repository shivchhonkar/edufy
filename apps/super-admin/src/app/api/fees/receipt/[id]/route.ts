import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { getPaymentReceiptByPaymentId } from '@/lib/payment-receipts';

// GET receipt details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const receiptId = params.id;

    if (!receiptId) {
      return NextResponse.json(
        { success: false, error: 'Receipt ID is required' },
        { status: 400 }
      );
    }

    // Try to get payment receipt from the new payment_receipts table first
    const receiptResult = await getPaymentReceiptByPaymentId(parseInt(receiptId));
    
    if (receiptResult.success) {
      // Use the detailed payment receipt data
      const receiptData = receiptResult.data;
      
      // Create fee breakdown from stored receipt data
      const feeBreakdown = receiptData.selected_months.map((monthName: string, index: number) => ({
        fee_type: 'Fee Payment',
        month: monthName,
        year: receiptData.academic_year,
        amount: receiptData.tuition_fees_per_month + receiptData.transport_fees_per_month + receiptData.other_fees_per_month,
        late_fee: 0
      }));

      const paymentWithBreakdown = {
        id: receiptData.payment_id,
        receipt_number: receiptData.receipt_number,
        payment_date: receiptData.payment_date,
        payment_method: receiptData.payment_method,
        transaction_id: receiptData.transaction_id,
        amount_paid: receiptData.total_amount_paid,
        late_fee_charged: receiptData.late_fee_charged,
        discount_applied: receiptData.discount_applied,
        academic_year: receiptData.academic_year,
        fee_breakdown: feeBreakdown,
        months_paid: receiptData.months_count,
        is_bulk_payment: receiptData.is_bulk_payment
      };

      return NextResponse.json({
        success: true,
        data: {
          payment: paymentWithBreakdown,
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
      [receiptId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 }
      );
    }

    const receiptData = result.rows[0];

    // Fallback fee breakdown
    const paymentDate = new Date(receiptData.payment_date);
    const feeBreakdown = [{
      fee_type: receiptData.fee_type || 'Fee Payment',
      month: receiptData.month || (paymentDate.getMonth() + 1),
      year: receiptData.academic_year || paymentDate.getFullYear(),
      amount: parseFloat(receiptData.amount_paid) - parseFloat(receiptData.late_fee_charged || 0),
      late_fee: parseFloat(receiptData.late_fee_charged || 0)
    }];

    const paymentWithBreakdown = {
      ...receiptData,
      fee_breakdown: feeBreakdown,
      months_paid: 1
    };

    return NextResponse.json({
      success: true,
      data: {
        payment: paymentWithBreakdown,
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
    console.error('Error fetching receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch receipt' },
      { status: 500 }
    );
  }
}


