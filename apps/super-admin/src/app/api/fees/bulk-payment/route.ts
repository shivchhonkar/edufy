import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { ensureFeeExtensions } from '@/lib/fees/ensure-fee-extensions';
import { generateNextReceiptNumber } from '@/lib/fees/ReceiptNumberService';
import { buildBreakdownFromPaymentFees } from '@/lib/fees/payment-fee-breakdown';
import { monthLongName, uniqueMonthsInAcademicOrder } from '@/lib/fees/fee-month-order';
import type { RequestDb } from '@/lib/request-db';

// Conditional import for payment receipts (optional feature)
let createPaymentReceipt: any = null;
try {
  const paymentReceipts = require('@/lib/payment-receipts');
  createPaymentReceipt = paymentReceipts.createPaymentReceipt;
} catch (error) {
  console.log('Payment receipts module not available, continuing without it');
}

async function resolveFeeStructureId(
  db: RequestDb,
  studentId: number,
  feeType: string
): Promise<number | null> {
  if (feeType.toLowerCase().includes('transport')) {
    const result = await db.query<{ id: number }>(
      `SELECT id FROM fee_structures
       WHERE fee_type ILIKE '%transport%' AND is_active = true
       ORDER BY id DESC LIMIT 1`
    );
    return result.rows[0]?.id ?? null;
  }

  const studentResult = await db.query<{ class_id: number }>(
    'SELECT class_id FROM students WHERE id = $1',
    [studentId]
  );
  const classId = studentResult.rows[0]?.class_id;
  if (!classId) return null;

  const result = await db.query<{ id: number }>(
    `SELECT id FROM fee_structures
     WHERE fee_type ILIKE $1 AND class_id = $2 AND is_active = true
     ORDER BY id DESC LIMIT 1`,
    [`%${feeType}%`, classId]
  );
  return result.rows[0]?.id ?? null;
}

async function findExistingStudentFee(
  db: RequestDb,
  studentId: number,
  academicYear: string,
  month: number,
  feeType: string
) {
  const result = await db.query<{
    id: number;
    amount_due: string;
    amount_paid: string;
    status: string;
    fee_type: string;
  }>(
    `SELECT sf.id, sf.amount_due, sf.amount_paid, sf.status, fs.fee_type
     FROM student_fees sf
     LEFT JOIN fee_structures fs ON fs.id = sf.fee_structure_id
     WHERE sf.student_id = $1 AND sf.academic_year = $2 AND sf.month = $3
       AND (
         ($4 ILIKE '%transport%' AND fs.fee_type ILIKE '%transport%')
         OR ($4 ILIKE '%tuition%' AND fs.fee_type ILIKE '%tuition%')
         OR fs.fee_type ILIKE $4
       )
     LIMIT 1`,
    [studentId, academicYear, month, feeType]
  );
  return result.rows[0] ?? null;
}

async function applyStudentFeePayment(
  db: RequestDb,
  params: {
    studentId: number;
    academicYear: string;
    month: number;
    year: number;
    feeType: string;
    amount: number;
    processedIds: Set<number>;
  }
): Promise<{ id: number; fee_type: string; month: number; year: number; amount: number }> {
  const { studentId, academicYear, month, year, feeType, amount, processedIds } = params;

  const existing = await findExistingStudentFee(db, studentId, academicYear, month, feeType);

  if (existing) {
    if (processedIds.has(existing.id)) {
      return {
        id: existing.id,
        fee_type: existing.fee_type || feeType,
        month,
        year,
        amount,
      };
    }

    const amountDue = parseFloat(existing.amount_due || '0');
    const newAmountPaid = parseFloat(existing.amount_paid || '0') + amount;
    const newStatus =
      amountDue > 0 && newAmountPaid >= amountDue ? 'paid' : newAmountPaid > 0 ? 'partial' : existing.status;

    await db.query(
      `UPDATE student_fees
       SET amount_paid = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newAmountPaid, newStatus, existing.id]
    );

    processedIds.add(existing.id);
    return { id: existing.id, fee_type: existing.fee_type || feeType, month, year, amount };
  }

  const feeStructureId = await resolveFeeStructureId(db, studentId, feeType);
  const dueDate = new Date(year, month, 0);

  const insertResult = await db.query<{ id: number }>(
    `INSERT INTO student_fees (
      student_id, fee_structure_id, academic_year, amount_due, amount_paid,
      month, due_date, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (student_id, fee_structure_id, academic_year, month)
    DO UPDATE SET
      amount_paid = student_fees.amount_paid + EXCLUDED.amount_paid,
      amount_due = GREATEST(student_fees.amount_due, EXCLUDED.amount_due),
      status = CASE
        WHEN student_fees.amount_paid + EXCLUDED.amount_paid >= GREATEST(student_fees.amount_due, EXCLUDED.amount_due)
        THEN 'paid'
        WHEN student_fees.amount_paid + EXCLUDED.amount_paid > 0 THEN 'partial'
        ELSE student_fees.status
      END,
      updated_at = CURRENT_TIMESTAMP
    RETURNING id`,
    [studentId, feeStructureId, academicYear, amount, amount, month, dueDate, 'paid']
  );

  const id = insertResult.rows[0].id;
  processedIds.add(id);
  return { id, fee_type: feeType, month, year, amount };
}

// POST record bulk fee payment for multiple months
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);
    await ensureFeeExtensions(db);
    const body = await request.json();
    const {
      student_id,
      student_fee_ids,
      fee_breakdown, // New field for advance payments
      total_amount_paid,
      payment_date,
      payment_method,
      transaction_id,
      remarks,
      discount_applied,
      late_fee_charged,
      academic_year,
      created_by,
      exempt_late_fees,
      student_fee_late_fees,
    } = body;

    // Validation - either student_fee_ids or fee_breakdown must be provided
    if (!student_id || !total_amount_paid || !payment_date || !payment_method) {
      return NextResponse.json(
        { success: false, error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    if ((!student_fee_ids || student_fee_ids.length === 0) && (!fee_breakdown || fee_breakdown.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Either student_fee_ids or fee_breakdown must be provided' },
        { status: 400 }
      );
    }

    // Generate receipt number
    const receipt_number = await generateNextReceiptNumber(
      db,
      academic_year || new Date().getFullYear().toString()
    );

    console.log('Bulk payment request received:', {
      student_id,
      student_fee_ids,
      fee_breakdown,
      total_amount_paid,
      payment_date
    });

    await db.query('BEGIN');

    try {
      let selectedFees = [];
      let feeBreakdown = [];

      if (student_fee_ids && student_fee_ids.length > 0) {
        const feesResult = await db.query(
          `SELECT sf.*, fs.fee_type
           FROM student_fees sf
           LEFT JOIN fee_structures fs ON fs.id = sf.fee_structure_id
           WHERE sf.id = ANY($1)`,
          [student_fee_ids]
        );
        selectedFees = feesResult.rows;
      }

      // Handle advance payments (fee_breakdown provided)
      if (fee_breakdown && fee_breakdown.length > 0) {
        feeBreakdown = fee_breakdown;
      }

      // Create a combined description
      const allFees = [...selectedFees, ...feeBreakdown];
      const orderedMonthNumbers = uniqueMonthsInAcademicOrder(allFees);
      const monthNames = orderedMonthNumbers.map(monthLongName).join(', ');

      const feeDescription = allFees.length > 1 
        ? `Multiple Fees Payment (${monthNames})`
        : allFees[0]?.fee_type || 'Bulk Payment';

      const paymentResult = await db.query(
        `INSERT INTO fee_payments (
          student_id, amount_paid, payment_date,
          payment_method, transaction_id, receipt_number, status, remarks, created_by,
          discount_applied, late_fee_charged, academic_year
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          student_id, total_amount_paid, payment_date,
          payment_method, transaction_id, receipt_number, 'completed', 
          remarks || `Bulk payment for ${allFees.length} months: ${monthNames}`, 
          created_by,
          discount_applied || 0, late_fee_charged || 0, academic_year
        ]
      );

      // Store payment breakdown in a JSON field or separate table
      const paymentBreakdown = buildBreakdownFromPaymentFees(allFees, academic_year);

      const selectedMonths = orderedMonthNumbers.map(monthLongName);

      // Calculate fee totals by type
      let totalTuitionPaid = 0;
      let totalTransportPaid = 0;
      let totalOtherPaid = 0;
      let tuitionPerMonth = 0;
      let transportPerMonth = 0;
      let otherPerMonth = 0;

      allFees.forEach(fee => {
        const amount = parseFloat(fee.amount || (parseFloat(fee.amount_due) - parseFloat(fee.amount_paid)));
        if (fee.fee_type && fee.fee_type.toLowerCase().includes('tuition')) {
          totalTuitionPaid += amount;
          tuitionPerMonth = amount;
        } else if (fee.fee_type && fee.fee_type.toLowerCase().includes('transport')) {
          totalTransportPaid += amount;
          transportPerMonth = amount;
        } else {
          totalOtherPaid += amount;
          otherPerMonth = amount;
        }
      });

      // Try to create payment receipt record (optional - for new receipt system)
      if (createPaymentReceipt) {
        try {
          const receiptResult = await createPaymentReceipt({
          payment_id: paymentResult.rows[0].id,
          student_id: student_id,
          receipt_number: receipt_number,
          payment_date: payment_date,
          academic_year: academic_year,
          selected_months: selectedMonths,
          tuition_fees_per_month: tuitionPerMonth,
          transport_fees_per_month: transportPerMonth,
          other_fees_per_month: otherPerMonth,
          total_tuition_paid: totalTuitionPaid,
          total_transport_paid: totalTransportPaid,
          total_other_paid: totalOtherPaid,
          total_amount_paid: total_amount_paid,
          payment_method: payment_method,
          transaction_id: transaction_id,
          late_fee_charged: late_fee_charged || 0,
          discount_applied: discount_applied || 0,
          receipt_type: 'original',
          is_bulk_payment: true,
          months_count: allFees.length
        });

        if (!receiptResult.success) {
          console.warn('Payment receipt creation skipped (table may not exist yet):', receiptResult.error);
        }
          } catch (error) {
            console.warn('Payment receipt creation skipped (table may not exist yet):', error);
            // Continue without payment receipt - not critical for payment processing
          }
        }

      // Update existing student_fees records (by explicit IDs from client)
      const processedFeeIds = new Set<number>();
      const lateFeesByStudentFeeId: Record<string, number> =
        student_fee_late_fees && typeof student_fee_late_fees === 'object'
          ? student_fee_late_fees
          : {};

      for (const fee of selectedFees) {
        const feeAmount = parseFloat(fee.amount_due) - parseFloat(fee.amount_paid);
        let feeLate = exempt_late_fees
          ? 0
          : parseFloat(
              lateFeesByStudentFeeId[String(fee.id)] ??
                fee.calculated_late_fee ??
                fee.late_fee_amount ??
                0,
            );
        const paymentAmount = feeAmount + feeLate;
        const newAmountPaid = parseFloat(fee.amount_paid || 0) + paymentAmount;
        const newStatus = newAmountPaid >= parseFloat(fee.amount_due) ? 'paid' : 'partial';
        const newLateFeeAmount = exempt_late_fees
          ? 0
          : parseFloat(fee.late_fee_amount || 0) + feeLate;

        await db.query(
          `UPDATE student_fees 
           SET amount_paid = $1,
               late_fee_amount = $2,
               status = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $4`,
          [newAmountPaid, newLateFeeAmount, newStatus, fee.id]
        );

        processedFeeIds.add(fee.id);
        console.log(`Updated student_fees record ${fee.id}: amount_paid=${newAmountPaid}, status=${newStatus}`);
      }

      // Apply payments from fee_breakdown (advance or fees not sent by ID)
      console.log('Processing fee breakdown:', feeBreakdown);
      for (const fee of feeBreakdown) {
        const existing = await findExistingStudentFee(
          db,
          student_id,
          academic_year,
          fee.month,
          fee.fee_type
        );

        if (existing && processedFeeIds.has(existing.id)) {
          console.log(`Skipping fee_breakdown — already processed id ${existing.id}`);
          continue;
        }

        const applied = await applyStudentFeePayment(db, {
          studentId: student_id,
          academicYear: academic_year,
          month: fee.month,
          year: fee.year || new Date().getFullYear(),
          feeType: fee.fee_type,
          amount: parseFloat(String(fee.amount)),
          processedIds: processedFeeIds,
        });

        console.log(`Applied payment for ${fee.fee_type} month ${fee.month}: student_fee_id=${applied.id}`);
      }

      await db.query(
        `UPDATE fee_payments SET fee_breakdown = $1::jsonb WHERE id = $2`,
        [JSON.stringify(paymentBreakdown), paymentResult.rows[0].id]
      );

      await db.query('COMMIT');

      // Prepare response with fee breakdown
      const response = {
        ...paymentResult.rows[0],
        fee_breakdown: paymentBreakdown,
        months_paid: allFees.length,
      };

      console.log('API Response prepared:', {
        payment_id: response.id,
        amount_paid: response.amount_paid,
        fee_breakdown: response.fee_breakdown,
        months_paid: response.months_paid
      });

      return NextResponse.json({
        success: true,
        data: response,
        message: `Bulk payment recorded successfully for ${allFees.length} fee(s)`,
      }, { status: 201 });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error: any) {
    console.error('Error recording bulk payment:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack
    });
    return NextResponse.json(
      { success: false, error: 'Failed to record bulk payment', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

