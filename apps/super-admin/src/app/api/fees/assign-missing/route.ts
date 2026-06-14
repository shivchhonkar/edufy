import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// POST - Assign fees to students who don't have any fee records
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json().catch(() => ({}));
    const { academic_year } = body;
    
    const currentYear = academic_year || new Date().getFullYear().toString();
    const currentMonth = new Date().getMonth() + 1;
    
    // Start transaction
    await db.query('BEGIN');

    // Find students who don't have any fee records
    const studentsWithoutFeesResult = await db.query(`
      SELECT s.id, s.class_id, s.first_name, s.last_name
      FROM students s
      WHERE s.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM student_fees sf 
        WHERE sf.student_id = s.id 
        AND sf.academic_year = $1
      )
      ORDER BY s.first_name, s.last_name
    `, [currentYear]);

    if (studentsWithoutFeesResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return NextResponse.json({
        success: true,
        message: 'All students already have fee records assigned',
        data: {
          studentsProcessed: 0,
          feesAssigned: 0
        }
      });
    }

    let totalAssigned = 0;
    let errors = [];

    // For each student without fees, assign default fees
    for (const student of studentsWithoutFeesResult.rows) {
      try {
        // Get fee structures for this student's class
        const feeStructuresResult = await db.query(
          `SELECT * FROM fee_structures 
           WHERE (class_id = $1 OR class_id IS NULL)
           AND frequency = 'monthly'
           AND is_active = true
           AND academic_year = $2`,
          [student.class_id, currentYear]
        );

        if (feeStructuresResult.rows.length === 0) {
          console.log(`No fee structures found for student ${student.first_name} ${student.last_name} (class ${student.class_id})`);
          continue;
        }

        // Assign fees for current month and next 2 months
        const months = [currentMonth, currentMonth + 1, currentMonth + 2].filter(m => m <= 12);

        for (const month of months) {
          for (const feeStructure of feeStructuresResult.rows) {
            // Calculate due date (10th of the month)
            const year = new Date().getFullYear();
            const dueDate = new Date(year, month - 1, 10);

            // Insert fee record
            await db.query(
              `INSERT INTO student_fees (
                student_id, fee_structure_id, academic_year, amount_due,
                due_date, month, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7)
              ON CONFLICT (student_id, fee_structure_id, academic_year, month) 
              DO NOTHING`,
              [
                student.id,
                feeStructure.id,
                currentYear,
                feeStructure.amount,
                dueDate.toISOString().split('T')[0],
                month,
                'pending'
              ]
            );
            totalAssigned++;
          }
        }
      } catch (studentError) {
        console.error(`Error assigning fees to student ${student.first_name} ${student.last_name}:`, studentError);
        errors.push({
          student: `${student.first_name} ${student.last_name}`,
          error: studentError instanceof Error ? studentError.message : 'Unknown error'
        });
      }
    }

    // Commit transaction
    await db.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: `Assigned fees to ${studentsWithoutFeesResult.rows.length} students who were missing fee records`,
      data: {
        studentsProcessed: studentsWithoutFeesResult.rows.length,
        feesAssigned: totalAssigned,
        academic_year: currentYear,
        errors: errors
      }
    });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error assigning missing fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign missing fees' },
      { status: 500 }
    );
  }
}







