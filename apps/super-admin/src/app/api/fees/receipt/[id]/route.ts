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

function monthNameFromNumber(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-IN', { month: 'long' });
}

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
      
      // Build fee breakdown with proper fee types + months + academic session
      const academicYear = String(receiptData.academic_year || '').trim();
      const [startYearRaw, endYearRaw] = academicYear.split('-');
      const startYear = parseInt(startYearRaw, 10) || new Date().getFullYear();
      const endYearPart = parseInt(endYearRaw, 10);
      const endYear = Number.isFinite(endYearPart)
        ? endYearPart < 100
          ? 2000 + endYearPart
          : endYearPart
        : startYear + 1;

      const monthNames: string[] = Array.isArray(receiptData.selected_months)
        ? receiptData.selected_months
        : [];

      const feeBreakdown: Array<{
        fee_type: string;
        month?: string;
        year?: number;
        amount: number;
        late_fee: number;
      }> = [];

      const tuitionPerMonth = Number(receiptData.tuition_fees_per_month || 0);
      const transportPerMonth = Number(receiptData.transport_fees_per_month || 0);
      const otherPerMonth = Number(receiptData.other_fees_per_month || 0);

      // For each selected month create separate rows by fee type
      for (const monthName of monthNames) {
        const m = new Date(`${monthName} 1, ${startYear}`).getMonth() + 1; // 1..12 (NaN-safe: invalid => NaN)
        const y = Number.isFinite(m) && m >= 4 ? startYear : endYear;

        if (tuitionPerMonth > 0) {
          feeBreakdown.push({
            fee_type: 'Tuition Fee',
            month: monthName,
            year: y,
            amount: tuitionPerMonth,
            late_fee: 0,
          });
        }

        if (transportPerMonth > 0) {
          feeBreakdown.push({
            fee_type: 'Transport Fee',
            month: monthName,
            year: y,
            amount: transportPerMonth,
            late_fee: 0,
          });
        }

        if (otherPerMonth > 0) {
          feeBreakdown.push({
            fee_type: 'Examination & Activity Fee',
            month: monthName,
            year: y,
            amount: otherPerMonth,
            late_fee: 0,
          });
        }
      }

      const paymentWithBreakdown = {
        id: receiptData.payment_id,
        receipt_number: receiptData.receipt_number,
        payment_date: receiptData.payment_date,
        payment_method: receiptData.payment_method,
        transaction_id: receiptData.transaction_id,
        amount_paid: receiptData.total_amount_paid,
        late_fee_charged: receiptData.late_fee_charged,
        discount_applied: receiptData.discount_applied,
        academic_year: academicYear,
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

    // Fallback fee breakdown (supports multi-month bulk payments via remarks and inferred updates)
    const paymentDate = new Date(receiptData.payment_date);
    const amountPaid = parseFloat(receiptData.amount_paid || 0);
    const lateFee = parseFloat(receiptData.late_fee_charged || 0);
    const baseAmount = Math.max(0, amountPaid - lateFee);

    const monthNum = parseInt(String(receiptData.month || 0), 10);
    const monthsFromFee = monthNum ? [monthNameFromNumber(monthNum)] : [];
    const monthsFromRemarks = parseMonthsFromRemarks(receiptData.remarks);
    let inferredMonths: string[] = [];
    let inferredFeeType: string | null = null;

    const inferredResult = await db.query(
      `SELECT sf.month, fs.fee_type, sf.amount_due, sf.amount_paid
       FROM student_fees sf
       LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
       WHERE sf.student_id = $1
         AND sf.academic_year = $2
         AND DATE(sf.updated_at) = DATE($3)
         AND sf.amount_paid > 0
       ORDER BY sf.month, fs.fee_type`,
      [
        receiptData.student_id,
        receiptData.academic_year || String(paymentDate.getFullYear()),
        receiptData.payment_date,
      ]
    );

    inferredMonths = inferredResult.rows
      .map((row: any) => parseInt(String(row.month || 0), 10))
      .filter((m: number) => Number.isFinite(m) && m >= 1 && m <= 12)
      .map((m: number) => monthNameFromNumber(m));

    const uniqueTypes = Array.from(
      new Set(
        inferredResult.rows
          .map((row: any) => String(row.fee_type || '').trim())
          .filter(Boolean)
      )
    );
    if (uniqueTypes.length === 1) {
      inferredFeeType = uniqueTypes[0];
    }

    const monthNames =
      monthsFromFee.length > 0
        ? monthsFromFee
        : monthsFromRemarks.length > 0
          ? monthsFromRemarks
          : inferredMonths.length > 0
            ? inferredMonths
            : [monthNameFromNumber(paymentDate.getMonth() + 1)];

    const perMonthAmount = monthNames.length > 0 ? baseAmount / monthNames.length : baseAmount;
    const rawFeeType = String(receiptData.fee_type || '').trim();
    const isGenericType =
      !rawFeeType || rawFeeType.toLowerCase() === 'fee payment';
    const displayFeeType =
      (!isGenericType ? rawFeeType : '') ||
      inferredFeeType ||
      'Fee Payment';

    let feeBreakdown: Array<{
      fee_type: string;
      month: string;
      year: string | number;
      amount: number;
      late_fee: number;
    }> = [];

    // If we detected multiple fee types/months from updated student fees, split rows accordingly.
    if (inferredResult.rows.length > 1) {
      const mappedRows = inferredResult.rows.map((row: any) => {
        const month = parseInt(String(row.month || 0), 10);
        const monthName =
          Number.isFinite(month) && month >= 1 && month <= 12
            ? monthNameFromNumber(month)
            : monthNames[0];
        const feeType = String(row.fee_type || '').trim() || displayFeeType;
        const due = parseFloat(String(row.amount_due || 0));
        const paid = parseFloat(String(row.amount_paid || 0));
        // Best-effort inferred contribution for this receipt
        const inferredAmount = Math.max(0, Math.min(due, paid));
        return {
          fee_type: feeType,
          month: monthName,
          year: receiptData.academic_year || paymentDate.getFullYear(),
          amount: inferredAmount,
          late_fee: 0,
        };
      });

      const totalInferred = mappedRows.reduce((sum, row) => sum + row.amount, 0);
      const safeBase = baseAmount > 0 ? baseAmount : amountPaid;
      const factor = totalInferred > 0 ? safeBase / totalInferred : 1;

      feeBreakdown = mappedRows.map((row) => ({
        ...row,
        amount: Math.max(0, row.amount * factor),
      }));
    } else {
      feeBreakdown = monthNames.map((monthName) => ({
        fee_type: displayFeeType,
        month: monthName,
        year: receiptData.academic_year || paymentDate.getFullYear(),
        amount: perMonthAmount,
        late_fee: 0,
      }));
    }

    if (lateFee > 0) {
      feeBreakdown.push({
        fee_type: 'Late Fee',
        month: monthNames[0],
        year: receiptData.academic_year || paymentDate.getFullYear(),
        amount: lateFee,
        late_fee: 0,
      });
    }

    const paymentWithBreakdown = {
      ...receiptData,
      fee_breakdown: feeBreakdown,
      months_paid: monthNames.length
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


