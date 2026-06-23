import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { FeePayment } from '@/shared/types';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { ensureFeeExtensions } from '@/lib/fees/ensure-fee-extensions';
import { generateNextReceiptNumber } from '@/lib/fees/ReceiptNumberService';
import { buildBreakdownFromPaymentFees } from '@/lib/fees/payment-fee-breakdown';

// Conditional import for payment receipts (optional feature)
let createPaymentReceipt: any = null;
try {
  const paymentReceipts = require('@/lib/payment-receipts');
  createPaymentReceipt = paymentReceipts.createPaymentReceipt;
} catch (error) {
  console.log('Payment receipts module not available, continuing without it');
}

// GET fee payments
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let queryText = `
      SELECT fp.*, s.first_name, s.last_name, s.admission_number,
             fs.fee_type, fs.amount as fee_amount
      FROM fee_payments fp
      JOIN students s ON fp.student_id = s.id
      LEFT JOIN fee_structures fs ON fp.fee_structure_id = fs.id
      WHERE 1=1
    `;
    let queryParams: any[] = [];
    let paramCount = 0;

    if (studentId) {
      paramCount++;
      queryText += ` AND fp.student_id = $${paramCount}`;
      queryParams.push(studentId);
    }

    if (status) {
      paramCount++;
      queryText += ` AND fp.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (startDate && endDate) {
      paramCount++;
      queryText += ` AND fp.payment_date BETWEEN $${paramCount} AND $${paramCount + 1}`;
      queryParams.push(startDate, endDate);
      paramCount++;
    }

    queryText += ' ORDER BY fp.payment_date DESC';

    const result = await db.query<FeePayment>(queryText, queryParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching fee payments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee payments' },
      { status: 500 }
    );
  }
}

// POST record fee payment
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);
    await ensureFeeExtensions(db);
    const body = await request.json();
    const {
      student_id,
      fee_structure_id,
      student_fee_id,
      amount_paid,
      payment_date,
      payment_method,
      transaction_id,
      remarks,
      created_by,
      discount_applied,
      late_fee_charged,
      month,
      academic_year,
    } = body;

    // Validation
    if (!student_id || !amount_paid || !payment_date || !payment_method) {
      return NextResponse.json(
        { success: false, error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    // Generate receipt number
    const receipt_number = await generateNextReceiptNumber(db, academic_year || new Date().getFullYear().toString());

    // Start transaction
    await db.query('BEGIN');

    try {
      // Insert payment record
      const result = await db.query<FeePayment>(
        `INSERT INTO fee_payments (
          student_id, fee_structure_id, student_fee_id, amount_paid, payment_date,
          payment_method, transaction_id, receipt_number, status, remarks, created_by,
          discount_applied, late_fee_charged, month, academic_year
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          student_id, fee_structure_id, student_fee_id, amount_paid, payment_date,
          payment_method, transaction_id, receipt_number, 'completed', remarks, created_by,
          discount_applied || 0, late_fee_charged || 0, month, academic_year
        ]
      );

      // Update student_fees if student_fee_id is provided
      if (student_fee_id) {
        // Get current student_fees record to calculate new status
        const currentFeeResult = await db.query(
          `SELECT amount_due, amount_paid FROM student_fees WHERE id = $1`,
          [student_fee_id]
        );
        
        if (currentFeeResult.rows.length > 0) {
          const currentFee = currentFeeResult.rows[0];
          const paymentAmount = amount_paid - (late_fee_charged || 0);
          const newAmountPaid = parseFloat(currentFee.amount_paid || 0) + paymentAmount;
          const newStatus = newAmountPaid >= parseFloat(currentFee.amount_due) ? 'paid' : 'partial';
          
          await db.query(
            `UPDATE student_fees 
             SET amount_paid = amount_paid + $1,
                 late_fee_amount = late_fee_amount + $2,
                 status = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [paymentAmount, late_fee_charged || 0, newStatus, student_fee_id]
          );
          
          console.log(`Updated student_fees record ${student_fee_id}: amount_paid=${newAmountPaid}, status=${newStatus}`);
        }
      }

      // Create detailed payment receipt record for single payments
      const monthName = month ? new Date(2024, month - 1).toLocaleString('default', { month: 'long' }) : 'Unknown';
      
      // Get fee type from fee structure if available
      let feeType = 'Fee Payment';
      if (fee_structure_id) {
        const feeStructureResult = await db.query(
          'SELECT fee_type FROM fee_structures WHERE id = $1',
          [fee_structure_id]
        );
        if (feeStructureResult.rows.length > 0) {
          feeType = feeStructureResult.rows[0].fee_type;
        }
      }

      // Calculate fee amounts by type
      const paymentAmount = parseFloat(amount_paid) - parseFloat(late_fee_charged || 0);
      let totalTuitionPaid = 0;
      let totalTransportPaid = 0;
      let totalOtherPaid = 0;
      let tuitionPerMonth = 0;
      let transportPerMonth = 0;
      let otherPerMonth = 0;

      if (feeType.toLowerCase().includes('tuition')) {
        totalTuitionPaid = paymentAmount;
        tuitionPerMonth = paymentAmount;
      } else if (feeType.toLowerCase().includes('transport')) {
        totalTransportPaid = paymentAmount;
        transportPerMonth = paymentAmount;
      } else {
        totalOtherPaid = paymentAmount;
        otherPerMonth = paymentAmount;
      }

      // Try to create payment receipt record (optional - for new receipt system)
      if (createPaymentReceipt) {
        try {
          const receiptResult = await createPaymentReceipt({
          payment_id: result.rows[0].id,
          student_id: student_id,
          receipt_number: receipt_number,
          payment_date: payment_date,
          academic_year: academic_year,
          selected_months: [monthName],
          tuition_fees_per_month: tuitionPerMonth,
          transport_fees_per_month: transportPerMonth,
          other_fees_per_month: otherPerMonth,
          total_tuition_paid: totalTuitionPaid,
          total_transport_paid: totalTransportPaid,
          total_other_paid: totalOtherPaid,
          total_amount_paid: amount_paid,
          payment_method: payment_method,
          transaction_id: transaction_id,
          late_fee_charged: late_fee_charged || 0,
          discount_applied: discount_applied || 0,
          receipt_type: 'original',
          is_bulk_payment: false,
          months_count: 1
        });

        if (!receiptResult.success) {
          console.warn('Payment receipt creation skipped (table may not exist yet):', receiptResult.error);
        }
          } catch (error) {
            console.warn('Payment receipt creation skipped (table may not exist yet):', error);
            // Continue without payment receipt - not critical for payment processing
          }
        }

      await db.query('COMMIT');

      // Prepare response with fee breakdown if student_fee_id was provided
      let responseData = result.rows[0];
      
      if (student_fee_id) {
        // Get the fee details for breakdown
        const feeDetailsResult = await db.query(
          `SELECT 
            sf.month, sf.amount_due, sf.amount_paid, sf.late_fee_amount,
            fs.fee_type, fs.frequency
           FROM student_fees sf
           LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
           WHERE sf.id = $1`,
          [student_fee_id]
        );

        if (feeDetailsResult.rows.length > 0) {
          const feeDetails = feeDetailsResult.rows[0];
          const breakdown = buildBreakdownFromPaymentFees(
            [
              {
                fee_type: feeDetails.fee_type,
                month: feeDetails.month,
                year: academic_year,
                amount: parseFloat(amount_paid) - parseFloat(late_fee_charged || 0),
                late_fee_amount: late_fee_charged || 0,
              },
            ],
            academic_year || '',
          );

          await db.query(
            `UPDATE fee_payments SET fee_breakdown = $1::jsonb WHERE id = $2`,
            [JSON.stringify(breakdown), result.rows[0].id],
          );

          responseData = {
            ...responseData,
            fee_breakdown: breakdown,
            months_paid: 1
          };
        }
      }

      return NextResponse.json({
        success: true,
        data: responseData,
        message: 'Fee payment recorded successfully',
      }, { status: 201 });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error recording fee payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record fee payment' },
      { status: 500 }
    );
  }
}


