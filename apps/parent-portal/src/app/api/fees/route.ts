import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireStudentFromQuery } from '@/lib/require-student-api';

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    const studentResult = await db.query(
      `SELECT s.*,
        COALESCE(c.name, c2.name) AS class_name,
        COALESCE(sec.name, sec2.name) AS section_name
       FROM students s
       LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
       LEFT JOIN classes c ON e.class_id = c.id
       LEFT JOIN sections sec ON e.section_id = sec.id
       LEFT JOIN classes c2 ON s.class_id = c2.id
       LEFT JOIN sections sec2 ON s.section_id = sec2.id
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

    // Get current academic year
    const academicYearResult = await db.query(
      'SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1'
    );
    const academicYear = academicYearResult.rows[0]?.academic_year || '2025-26';

    // Get all fees for the student
    const feesResult = await db.query(
      `SELECT sf.*, fs.fee_type, fc.name as category_name
       FROM student_fees sf
       LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
       LEFT JOIN fee_categories fc ON fs.category_id = fc.id
       WHERE sf.student_id = $1
       AND sf.academic_year = $2
       ORDER BY sf.month, sf.due_date`,
      [studentId, academicYear]
    );

    const fees = feesResult.rows;

    // Calculate summary
    let totalDue = 0;
    let totalPaid = 0;
    let totalLateFee = 0;

    fees.forEach((fee: any) => {
      totalDue += parseFloat(fee.amount_due || 0);
      totalPaid += parseFloat(fee.amount_paid || 0);
      totalLateFee += parseFloat(fee.late_fee_amount || 0);
    });

    const totalPending = totalDue - totalPaid + totalLateFee;

    return NextResponse.json({
      success: true,
      data: {
        student,
        fees,
        summary: {
          total: totalDue + totalLateFee,
          paid: totalPaid,
          pending: totalPending,
          lateFee: totalLateFee,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fees' },
      { status: 500 }
    );
  }
}



























































