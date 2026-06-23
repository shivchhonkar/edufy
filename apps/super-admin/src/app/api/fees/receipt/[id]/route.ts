import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { ensureFeeExtensions } from '@/lib/fees/ensure-fee-extensions';
import {
  parseStoredFeeBreakdown,
  sortFeeBreakdownByAcademicOrder,
  type StoredFeeBreakdownItem,
} from '@/lib/fees/payment-fee-breakdown';
import {
  monthLongName,
  resolveMonthCalendarYear,
  sortCalendarMonthNumbers,
} from '@/lib/fees/fee-month-order';

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

function parseFeeCountFromRemarks(remarks: unknown): number | null {
  const match = String(remarks || '').match(/Payment for (\d+) fee/i);
  if (!match) return null;
  const count = parseInt(match[1], 10);
  return Number.isFinite(count) && count > 0 ? count : null;
}

function monthNameFromNumber(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-IN', { month: 'long' });
}

function buildStudentPayload(row: Record<string, unknown>) {
  return {
    id: row.student_id,
    first_name: row.first_name,
    last_name: row.last_name,
    admission_number: row.admission_number,
    parent_name: row.parent_name,
    parent_phone: row.parent_phone,
    parent_email: row.parent_email,
    class_name: row.class_name,
    section_name: row.section_name,
  };
}

function buildPaymentPayload(
  row: Record<string, unknown>,
  feeBreakdown: StoredFeeBreakdownItem[],
) {
  return {
    id: row.id,
    receipt_number: row.receipt_number,
    payment_date: row.payment_date,
    payment_method: row.payment_method,
    transaction_id: row.transaction_id,
    amount_paid: row.amount_paid,
    late_fee_charged: row.late_fee_charged,
    discount_applied: row.discount_applied,
    academic_year: row.academic_year,
    remarks: row.remarks,
    fee_breakdown: feeBreakdown,
    months_paid: feeBreakdown.length,
  };
}

function parseMonthNameToNumber(name: string): number | null {
  const month = new Date(`${name} 1, 2000`).getMonth() + 1;
  return Number.isFinite(month) && month >= 1 && month <= 12 ? month : null;
}

function buildBreakdownFromPaymentReceiptRow(
  receiptData: Record<string, unknown>,
): StoredFeeBreakdownItem[] {
  const stored = parseStoredFeeBreakdown(receiptData.fee_breakdown);
  const academicYear = String(receiptData.academic_year || '').trim();
  if (stored.length) {
    return sortFeeBreakdownByAcademicOrder(stored, academicYear);
  }

  let monthNames: string[] = [];
  try {
    monthNames = Array.isArray(receiptData.selected_months)
      ? (receiptData.selected_months as string[])
      : JSON.parse(String(receiptData.selected_months || '[]'));
  } catch {
    monthNames = [];
  }

  const totalTuition = Number(receiptData.total_tuition_paid || 0);
  const totalTransport = Number(receiptData.total_transport_paid || 0);
  const totalOther = Number(receiptData.total_other_paid || 0);
      const tuitionPerMonth = Number(receiptData.tuition_fees_per_month || 0);
      const transportPerMonth = Number(receiptData.transport_fees_per_month || 0);
      const otherPerMonth = Number(receiptData.other_fees_per_month || 0);

  const feeBreakdown: StoredFeeBreakdownItem[] = [];
  const orderedMonthNumbers = sortCalendarMonthNumbers(
    [...new Set(monthNames.map(parseMonthNameToNumber).filter((m): m is number => m != null))],
  );

  for (const m of orderedMonthNumbers) {
    const monthName = monthLongName(m);
    const y = resolveMonthCalendarYear(m, academicYear);

    if (totalTuition > 0 && tuitionPerMonth > 0) {
          feeBreakdown.push({
            fee_type: 'Tuition Fee',
            month: monthName,
            year: y,
            amount: tuitionPerMonth,
            late_fee: 0,
          });
        }

    if (totalTransport > 0 && transportPerMonth > 0) {
          feeBreakdown.push({
            fee_type: 'Transport Fee',
            month: monthName,
            year: y,
            amount: transportPerMonth,
            late_fee: 0,
          });
        }

    if (totalOther > 0 && otherPerMonth > 0) {
          feeBreakdown.push({
            fee_type: 'Examination & Activity Fee',
            month: monthName,
            year: y,
            amount: otherPerMonth,
            late_fee: 0,
          });
        }
      }

  return feeBreakdown;
}

async function inferBreakdownFromStudentFees(
  db: Awaited<ReturnType<typeof getRequestDb>>['db'],
  receiptData: Record<string, unknown>,
): Promise<StoredFeeBreakdownItem[]> {
  const paymentDate = new Date(String(receiptData.payment_date));
  const amountPaid = parseFloat(String(receiptData.amount_paid || 0));
  const lateFee = parseFloat(String(receiptData.late_fee_charged || 0));
  const baseAmount = Math.max(0, amountPaid - lateFee);
  const paymentCreatedAt = receiptData.created_at || receiptData.payment_date;

  const inferredResult = await db.query<{
    month: number;
    fee_type: string | null;
    amount_due: string;
    amount_paid: string;
  }>(
    `SELECT sf.month, fs.fee_type, sf.amount_due, sf.amount_paid
     FROM student_fees sf
     LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
     WHERE sf.student_id = $1
       AND sf.academic_year = $2
       AND sf.updated_at >= ($3::timestamptz - interval '30 seconds')
       AND sf.updated_at <= ($3::timestamptz + interval '30 seconds')
       AND sf.amount_paid > 0
     ORDER BY sf.month, fs.fee_type`,
    [
      receiptData.student_id,
      receiptData.academic_year || String(paymentDate.getFullYear()),
      paymentCreatedAt,
    ]
  );

  if (inferredResult.rows.length === 0) {
    return [];
  }

  const candidates = inferredResult.rows.map((row) => {
    const month = parseInt(String(row.month || 0), 10);
    const due = parseFloat(String(row.amount_due || 0));
    const paid = parseFloat(String(row.amount_paid || 0));
    return {
      fee_type: String(row.fee_type || 'Fee Payment').trim() || 'Fee Payment',
      month: Number.isFinite(month) && month >= 1 && month <= 12 ? month : paymentDate.getMonth() + 1,
      year: receiptData.academic_year || paymentDate.getFullYear(),
      amount: Math.max(0, Math.min(due, paid)),
      late_fee: 0,
    };
  });

  const targetCount = parseFeeCountFromRemarks(receiptData.remarks);
  const targetAmount = baseAmount > 0 ? baseAmount : amountPaid;

  const pickBestSubset = (rows: StoredFeeBreakdownItem[]): StoredFeeBreakdownItem[] => {
    if (!targetCount || rows.length <= targetCount) {
      const total = rows.reduce((sum, row) => sum + row.amount, 0);
      if (total <= targetAmount + 0.01) return rows;
    }

    let best: StoredFeeBreakdownItem[] | null = null;
    let bestDiff = Number.POSITIVE_INFINITY;

    const visit = (index: number, chosen: StoredFeeBreakdownItem[], total: number) => {
      if (targetCount && chosen.length > targetCount) return;
      if (index === rows.length) {
        if (targetCount && chosen.length !== targetCount) return;
        const diff = Math.abs(total - targetAmount);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = [...chosen];
        }
        return;
      }
      visit(index + 1, chosen, total);
      visit(index + 1, [...chosen, rows[index]], total + rows[index].amount);
    };

    visit(0, [], 0);
    return best && bestDiff <= 0.01 ? best : rows;
  };

  const selected = pickBestSubset(candidates);
  const totalSelected = selected.reduce((sum, row) => sum + row.amount, 0);
  const factor = totalSelected > 0 ? targetAmount / totalSelected : 1;

  return sortFeeBreakdownByAcademicOrder(
    selected.map((row) => ({
      ...row,
      amount: Math.max(0, row.amount * factor),
    })),
    String(receiptData.academic_year || paymentDate.getFullYear()),
  );
}

async function buildLegacyFallbackBreakdown(
  db: Awaited<ReturnType<typeof getRequestDb>>['db'],
  receiptData: Record<string, unknown>,
): Promise<StoredFeeBreakdownItem[]> {
  const inferred = await inferBreakdownFromStudentFees(db, receiptData);
  if (inferred.length) return inferred;

  const paymentDate = new Date(String(receiptData.payment_date));
  const amountPaid = parseFloat(String(receiptData.amount_paid || 0));
  const lateFee = parseFloat(String(receiptData.late_fee_charged || 0));
  const baseAmount = Math.max(0, amountPaid - lateFee);

  const monthNum = parseInt(String(receiptData.month || 0), 10);
  const monthsFromFee = monthNum ? [monthNameFromNumber(monthNum)] : [];
  const monthsFromRemarks = parseMonthsFromRemarks(receiptData.remarks);
  const monthNames =
    monthsFromFee.length > 0
      ? monthsFromFee
      : monthsFromRemarks.length > 0
        ? monthsFromRemarks
        : [monthNameFromNumber(paymentDate.getMonth() + 1)];

  const rawFeeType = String(receiptData.fee_type || '').trim();
  const displayFeeType =
    rawFeeType && rawFeeType.toLowerCase() !== 'fee payment' ? rawFeeType : 'Fee Payment';
  const perMonthAmount = monthNames.length > 0 ? baseAmount / monthNames.length : baseAmount;

  const academicYearStr = String(receiptData.academic_year || '').trim();
  const fallbackStartYear =
    parseInt(academicYearStr.split('-')[0], 10) || paymentDate.getFullYear();

  const breakdown = monthNames.map((monthName) => {
    const monthNumParsed = new Date(`${monthName} 1, ${fallbackStartYear}`).getMonth() + 1;
    return {
      fee_type: displayFeeType,
      month: Number.isFinite(monthNumParsed) && monthNumParsed >= 1 ? monthNumParsed : paymentDate.getMonth() + 1,
      year: receiptData.academic_year || paymentDate.getFullYear(),
      amount: perMonthAmount,
      late_fee: 0,
    };
  });

  if (lateFee > 0) {
    breakdown.push({
      fee_type: 'Late Fee',
      month: breakdown[0]?.month ?? paymentDate.getMonth() + 1,
      year: receiptData.academic_year || paymentDate.getFullYear(),
      amount: lateFee,
      late_fee: 0,
    });
  }

  return breakdown;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);
    await ensureFeeExtensions(db);

    const receiptId = params.id;
    if (!receiptId) {
      return NextResponse.json(
        { success: false, error: 'Receipt ID is required' },
        { status: 400 },
      );
    }

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
        fs.fee_type
       FROM fee_payments fp
       JOIN students s ON fp.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN fee_structures fs ON fp.fee_structure_id = fs.id
       WHERE fp.id = $1`,
      [receiptId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Receipt not found' },
        { status: 404 },
      );
    }

    const receiptData = result.rows[0] as Record<string, unknown>;

    let feeBreakdown = parseStoredFeeBreakdown(receiptData.fee_breakdown);
    const academicYearLabel = String(receiptData.academic_year || '');

    if (feeBreakdown.length) {
      feeBreakdown = sortFeeBreakdownByAcademicOrder(feeBreakdown, academicYearLabel);
    }

    if (!feeBreakdown.length) {
      try {
        const prResult = await db.query(
          `SELECT pr.*
           FROM payment_receipts pr
           WHERE pr.payment_id = $1
           LIMIT 1`,
          [receiptId],
        );

        if (prResult.rows.length > 0) {
          feeBreakdown = buildBreakdownFromPaymentReceiptRow(
            prResult.rows[0] as Record<string, unknown>,
          );
        }
      } catch {
        // payment_receipts table may not exist on this tenant
      }
    }

    if (!feeBreakdown.length) {
      feeBreakdown = await buildLegacyFallbackBreakdown(db, receiptData);
    }

    if (feeBreakdown.length) {
      feeBreakdown = sortFeeBreakdownByAcademicOrder(feeBreakdown, academicYearLabel);
    }

    return NextResponse.json({
      success: true,
      data: {
        payment: buildPaymentPayload(receiptData, feeBreakdown),
        student: buildStudentPayload(receiptData),
      },
    });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch receipt' },
      { status: 500 },
    );
  }
}
