import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { getStudentPaymentReceipts, generateCompletePaymentSummary } from '@/lib/payment-receipts';

// GET complete payment summary for a student
export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = params.studentId;

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
    const currentYear = new Date().getFullYear().toString();

    // Get all payment receipts for this student
    const receiptsResult = await getStudentPaymentReceipts(parseInt(studentId), currentYear);
    
    if (!receiptsResult.success) {
      return NextResponse.json(
        { success: false, error: receiptsResult.error },
        { status: 500 }
      );
    }

    const receipts = receiptsResult.data;

    // Create complete payment summary
    let allFeeBreakdown = [];
    let totalPaid = 0;
    let totalTuitionPaid = 0;
    let totalTransportPaid = 0;
    let totalOtherPaid = 0;

    for (const receipt of receipts) {
      // Add fee breakdown for each month in this receipt
      receipt.selected_months.forEach((monthName: string) => {
        allFeeBreakdown.push({
          fee_type: 'Fee Payment',
          month: monthName,
          year: receipt.academic_year,
          amount: receipt.tuition_fees_per_month + receipt.transport_fees_per_month + receipt.other_fees_per_month,
          late_fee: receipt.late_fee_charged,
          receipt_number: receipt.receipt_number,
          payment_date: receipt.payment_date,
          payment_method: receipt.payment_method
        });
      });

      totalPaid += parseFloat(receipt.total_amount_paid);
      totalTuitionPaid += parseFloat(receipt.total_tuition_paid);
      totalTransportPaid += parseFloat(receipt.total_transport_paid);
      totalOtherPaid += parseFloat(receipt.total_other_paid);
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
      id: 'complete-summary',
      receipt_number: 'COMPLETE-SUMMARY',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'SUMMARY',
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
