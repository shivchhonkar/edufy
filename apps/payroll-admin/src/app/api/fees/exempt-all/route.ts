import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// POST - Exempt all months' fees for a student
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { student_id, academic_year, exemption_reason } = body;

    if (!student_id || !academic_year) {
      return NextResponse.json(
        { success: false, error: 'Student ID and academic year are required' },
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

    const feeStructureId = feeStructureResult.rows.length > 0 
      ? feeStructureResult.rows[0].id 
      : null;
    const defaultAmount = feeStructureResult.rows.length > 0 
      ? feeStructureResult.rows[0].amount 
      : 4000;

    // Update existing fees to exempted status
    const updateResult = await db.query(
      `UPDATE student_fees 
       SET status = 'exempted', 
           amount_paid = amount_due,
           exemption_reason = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $2 AND academic_year = $3
       RETURNING *`,
      [exemption_reason || 'All fees exempted by admin', student_id, academic_year]
    );

    // Get the academic year start year
    const yearParts = academic_year.split('-');
    const startYear = parseInt(yearParts[0]);

    // Create fee records for months that don't exist yet (April to March)
    const months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];
    const exemptedMonths = [];

    for (const month of months) {
      const year = month >= 4 ? startYear : startYear + 1;
      
      // Check if record exists
      const existingCheck = await db.query(
        `SELECT id FROM student_fees 
         WHERE student_id = $1 AND month = $2 AND academic_year = $3`,
        [student_id, month, academic_year]
      );

      if (existingCheck.rows.length === 0) {
        // Create exempted fee record
        await db.query(
          `INSERT INTO student_fees (
            student_id, fee_structure_id, month, academic_year,
            amount_due, amount_paid, status, exemption_reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            student_id,
            feeStructureId,
            month,
            academic_year,
            defaultAmount,
            defaultAmount,
            'exempted',
            exemption_reason || 'All fees exempted by admin'
          ]
        );
        exemptedMonths.push(`${month}/${year}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All fees exempted successfully',
      data: {
        updated_count: updateResult.rowCount,
        created_count: exemptedMonths.length,
        exempted_months: exemptedMonths,
      },
    });

  } catch (error) {
    console.error('Error exempting all fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to exempt all fees' },
      { status: 500 }
    );
  }
}








