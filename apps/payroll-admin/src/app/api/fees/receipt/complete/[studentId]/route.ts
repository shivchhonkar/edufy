import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';

type ReceiptRow = {
  payment_id?: number;
  receipt_number: string;
  payment_date: string;
  payment_method: string;
  transaction_id: string | null;
  academic_year: string;
  selected_months: unknown;
  tuition_fees_per_month: string | number;
  transport_fees_per_month: string | number;
  other_fees_per_month: string | number;
  total_tuition_paid: string | number;
  total_transport_paid: string | number;
  total_other_paid: string | number;
  total_amount_paid: string | number;
  late_fee_charged: string | number;
  discount_applied: string | number;
};

function parseMonths(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((v) => String(v));
      return [];
    } catch {
      return [];
    }
  }
  return [];
}

function isMissingPaymentReceiptsTable(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('relation "payment_receipts" does not exist');
}

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

// GET complete payment summary for a student
export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = params.studentId;
    const paymentIdParam = request.nextUrl.searchParams.get('payment_id');
    const targetPaymentId = paymentIdParam ? parseInt(paymentIdParam, 10) : null;

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Fetch student details
    const studentResult = await db.query(
      `SELECT 
        s.*, c.name as class_name, sec.name as section_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE s.id = $1`,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const student = studentResult.rows[0];
    const academicYearResult = await db.query(
      'SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1'
    );
    const currentYear =
      academicYearResult.rows[0]?.academic_year ||
      new Date().getFullYear().toString();

    let receipts: ReceiptRow[] = [];
    try {
      const receiptsResult = await db.query<ReceiptRow>(
        `SELECT
          payment_id,
          receipt_number,
          payment_date,
          payment_method,
          transaction_id,
          academic_year,
          selected_months,
          tuition_fees_per_month,
          transport_fees_per_month,
          other_fees_per_month,
          total_tuition_paid,
          total_transport_paid,
          total_other_paid,
          total_amount_paid,
          late_fee_charged,
          discount_applied
        FROM payment_receipts
        WHERE student_id = $1
          AND academic_year = $2
          ${targetPaymentId ? 'AND payment_id = $3' : ''}
        ORDER BY payment_date DESC`,
        targetPaymentId
          ? [parseInt(studentId, 10), currentYear, targetPaymentId]
          : [parseInt(studentId, 10), currentYear]
      );
      receipts = receiptsResult.rows;
    } catch (error) {
      if (!isMissingPaymentReceiptsTable(error)) throw error;

      // Fallback for tenants where payment_receipts table is not migrated yet
      const fallbackResult = await db.query(
        `SELECT
          fp.receipt_number,
          fp.payment_date,
          fp.payment_method,
          fp.transaction_id,
          COALESCE(fp.academic_year, $2) as academic_year,
          fp.id as payment_id,
          fp.remarks,
          sf.month,
          fs.fee_type,
          fp.amount_paid,
          fp.late_fee_charged,
          fp.discount_applied
        FROM fee_payments fp
        LEFT JOIN student_fees sf ON fp.student_fee_id = sf.id
        LEFT JOIN fee_structures fs ON fp.fee_structure_id = fs.id
        WHERE fp.student_id = $1
          AND fp.status = 'completed'
          ${targetPaymentId ? 'AND fp.id = $3' : ''}
        ORDER BY fp.payment_date DESC`,
        targetPaymentId
          ? [parseInt(studentId, 10), currentYear, targetPaymentId]
          : [parseInt(studentId, 10), currentYear]
      );

      receipts = fallbackResult.rows.map((row: any) => {
        const monthNum = parseInt(String(row.month || 0), 10);
        const monthNameFromMonth = monthNum
          ? new Date(2000, monthNum - 1, 1).toLocaleString('en-IN', { month: 'long' })
          : '';
        const monthNames = monthNameFromMonth
          ? [monthNameFromMonth]
          : parseMonthsFromRemarks(row.remarks);
        const amountPaid = parseFloat(String(row.amount_paid || 0));
        const feeType = String(row.fee_type || '').toLowerCase();
        const tuition = feeType.includes('transport') ? 0 : amountPaid;
        const transport = feeType.includes('transport') ? amountPaid : 0;
        const other = tuition === 0 && transport === 0 ? amountPaid : 0;

        return {
          receipt_number: row.receipt_number,
          payment_date: row.payment_date,
          payment_method: row.payment_method,
          transaction_id: row.transaction_id,
          academic_year: row.academic_year || currentYear,
          selected_months: monthNames,
          tuition_fees_per_month: tuition,
          transport_fees_per_month: transport,
          other_fees_per_month: other,
          total_tuition_paid: tuition,
          total_transport_paid: transport,
          total_other_paid: other,
          total_amount_paid: amountPaid,
          late_fee_charged: parseFloat(String(row.late_fee_charged || 0)),
          discount_applied: parseFloat(String(row.discount_applied || 0)),
        };
      });
    }

    if (!receipts.length) {
      return NextResponse.json(
        { success: false, error: 'No payment records found for this student' },
        { status: 404 }
      );
    }

    // Create complete payment summary
    let allFeeBreakdown: Array<Record<string, unknown>> = [];
    let totalPaid = 0;
    let totalTuitionPaid = 0;
    let totalTransportPaid = 0;
    let totalOtherPaid = 0;

    for (const receipt of receipts) {
      // Add fee breakdown for each month in this receipt with actual fee types
      const selectedMonths = parseMonths(receipt.selected_months);
      const tuitionPerMonth = parseFloat(String(receipt.tuition_fees_per_month || 0));
      const transportPerMonth = parseFloat(String(receipt.transport_fees_per_month || 0));
      const otherPerMonth = parseFloat(String(receipt.other_fees_per_month || 0));
      const lateFee = parseFloat(String(receipt.late_fee_charged || 0));

      selectedMonths.forEach((monthName: string) => {
        if (tuitionPerMonth > 0) {
          allFeeBreakdown.push({
            fee_type: 'Tuition Fee',
            month: monthName,
            year: receipt.academic_year,
            amount: tuitionPerMonth,
            late_fee: 0,
            receipt_number: receipt.receipt_number,
            payment_date: receipt.payment_date,
            payment_method: receipt.payment_method,
          });
        }

        if (transportPerMonth > 0) {
          allFeeBreakdown.push({
            fee_type: 'Transport Fee',
            month: monthName,
            year: receipt.academic_year,
            amount: transportPerMonth,
            late_fee: 0,
            receipt_number: receipt.receipt_number,
            payment_date: receipt.payment_date,
            payment_method: receipt.payment_method,
          });
        }

        if (otherPerMonth > 0) {
          allFeeBreakdown.push({
            fee_type: 'Examination & Activity Fee',
            month: monthName,
            year: receipt.academic_year,
            amount: otherPerMonth,
            late_fee: 0,
            receipt_number: receipt.receipt_number,
            payment_date: receipt.payment_date,
            payment_method: receipt.payment_method,
          });
        }
      });

      // Attach late fee as a separate line item for the first selected month
      if (lateFee > 0 && selectedMonths.length > 0) {
        allFeeBreakdown.push({
          fee_type: 'Late Fee',
          month: selectedMonths[0],
          year: receipt.academic_year,
          amount: lateFee,
          late_fee: 0,
          receipt_number: receipt.receipt_number,
          payment_date: receipt.payment_date,
          payment_method: receipt.payment_method,
        });
      }

      totalPaid += parseFloat(String(receipt.total_amount_paid || 0));
      totalTuitionPaid += parseFloat(String(receipt.total_tuition_paid || 0));
      totalTransportPaid += parseFloat(String(receipt.total_transport_paid || 0));
      totalOtherPaid += parseFloat(String(receipt.total_other_paid || 0));
    }

    // Group by month and year
    const monthGroups: { [key: string]: any[] } = {};
    allFeeBreakdown.forEach((fee: any) => {
      const monthKey = `${fee.month}-${fee.year}`;
      if (!monthGroups[monthKey]) monthGroups[monthKey] = [];
      monthGroups[monthKey].push(fee);
    });

    // Create summary payment object
    const summaryPayment = {
      id: targetPaymentId || receipts[0]?.payment_id || 'complete-summary',
      receipt_number:
        receipts.length === 1
          ? receipts[0].receipt_number
          : targetPaymentId
            ? (receipts[0]?.receipt_number || 'COMPLETE-SUMMARY')
            : 'COMPLETE-SUMMARY',
      payment_date:
        receipts.length === 1
          ? receipts[0].payment_date
          : new Date().toISOString().split('T')[0],
      payment_method:
        receipts.length === 1
          ? receipts[0].payment_method
          : 'SUMMARY',
      amount_paid: totalPaid,
      academic_year: currentYear,
      fee_breakdown: allFeeBreakdown,
      months_paid: Object.keys(monthGroups).length,
      summary: {
        total_paid: totalPaid,
        tuition_paid: totalTuitionPaid,
        transport_paid: totalTransportPaid,
        other_paid: totalOtherPaid,
        payment_count: receipts.length,
        month_breakdown: Object.entries(monthGroups).map(([monthKey, fees]) => {
          const [month, year] = monthKey.split('-');
          const monthTotal = fees.reduce((sum, fee) => sum + parseFloat(fee.amount || 0), 0);
          return {
            month: month,
            year: parseInt(year),
            total: monthTotal,
            fees: fees
          };
        })
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        payment: summaryPayment,
        student: {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          admission_number: student.admission_number,
          parent_name: student.parent_name,
          parent_phone: student.parent_phone,
          parent_email: student.parent_email,
          class_name: student.class_name,
          section_name: student.section_name,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching complete payment summary:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment summary' },
      { status: 500 }
    );
  }
}
