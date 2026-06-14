import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// GET or generate monthly fees for a student
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { student_id, academic_year, months } = body;

    if (!student_id || !academic_year || !months || months.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    // Get student details including class
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

    // Get fee structures for the student's class (monthly fees)
    const feeStructuresResult = await db.query(
      `SELECT * FROM fee_structures 
       WHERE (class_id = $1 OR class_id IS NULL)
       AND frequency = 'monthly'
       AND is_active = true
       AND academic_year = $2`,
      [student.class_id, academic_year]
    );

    // Get transport fee if student is enrolled
    const transportResult = await db.query(
      `SELECT st.*, rs.pickup_fee, r.route_name
       FROM student_transport st
       LEFT JOIN route_stops rs ON st.stop_id = rs.id
       LEFT JOIN routes r ON st.route_id = r.id
       WHERE st.student_id = $1 AND st.status = 'active'`,
      [student_id]
    );

    const createdFees = [];

    // For each month and fee structure, create or get existing student_fee
    for (const month of months) {
      for (const feeStructure of feeStructuresResult.rows) {
        // Calculate due date (10th of the month)
        const year = new Date().getFullYear();
        const dueDate = new Date(year, month - 1, 10);

        try {
          // Try to insert, if exists will be ignored due to UNIQUE constraint
          const result = await db.query(
            `INSERT INTO student_fees (
              student_id, fee_structure_id, academic_year, amount_due,
              due_date, month, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (student_id, fee_structure_id, academic_year, month) 
            DO UPDATE SET updated_at = CURRENT_TIMESTAMP
            RETURNING *`,
            [
              student_id,
              feeStructure.id,
              academic_year,
              feeStructure.amount,
              dueDate.toISOString().split('T')[0],
              month,
              'pending'
            ]
          );
          
          if (result.rows.length > 0) {
            createdFees.push(result.rows[0]);
          }
        } catch (err) {
          console.error('Error creating fee:', err);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        created_count: createdFees.length,
        student_has_transport: transportResult.rows.length > 0,
        transport_fee: transportResult.rows[0]?.pickup_fee || transportResult.rows[0]?.monthly_fee || null,
      },
      message: `Generated/verified fees for ${months.length} month(s)`,
    });
  } catch (error) {
    console.error('Error generating monthly fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate monthly fees' },
      { status: 500 }
    );
  }
}









