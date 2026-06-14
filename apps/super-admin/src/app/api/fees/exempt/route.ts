import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// POST - Exempt a single month's fee for a student
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { student_id, month, year, academic_year, exemption_reason } = body;

    if (!student_id || !month || !year) {
      return NextResponse.json(
        { success: false, error: 'Student ID, month, and year are required' },
        { status: 400 }
      );
    }

    // Check if student exists
    const studentResult = await db.query(
      'SELECT * FROM students WHERE id = $1',
      [student_id]
    );

    if (studentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    const student = studentResult.rows[0];

    // Get fee structure for this student's class
    const feeStructureResult = await db.query(
      `SELECT * FROM fee_structures 
       WHERE class_id = $1 
       AND fee_type ILIKE '%tuition%' 
       AND is_active = true 
       AND academic_year = $2
       LIMIT 1`,
      [student.class_id, academic_year]
    );

    let feeStructureId = null;
    if (feeStructureResult.rows.length > 0) {
      feeStructureId = feeStructureResult.rows[0].id;
    }

    // Check if fee record already exists
    const existingFeeResult = await db.query(
      `SELECT * FROM student_fees 
       WHERE student_id = $1 AND month = $2 AND academic_year = $3`,
      [student_id, month, academic_year]
    );

    let result;
    if (existingFeeResult.rows.length > 0) {
      // Update existing fee to exempted status
      result = await db.query(
        `UPDATE student_fees 
         SET status = 'exempted', 
             amount_paid = amount_due,
             exemption_reason = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $2 AND month = $3 AND academic_year = $4
         RETURNING *`,
        [exemption_reason || 'Fee exempted by admin', student_id, month, academic_year]
      );
    } else {
      // Create new fee record with exempted status
      const defaultAmount = feeStructureResult.rows.length > 0 
        ? feeStructureResult.rows[0].amount 
        : 4000;

      result = await db.query(
        `INSERT INTO student_fees (
          student_id, fee_structure_id, month, academic_year,
          amount_due, amount_paid, status, exemption_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          student_id,
          feeStructureId,
          month,
          academic_year,
          defaultAmount,
          defaultAmount, // Mark as fully paid
          'exempted',
          exemption_reason || 'Fee exempted by admin'
        ]
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Fee exempted successfully',
      data: result.rows[0],
    });

  } catch (error) {
    console.error('Error exempting fee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to exempt fee' },
      { status: 500 }
    );
  }
}








