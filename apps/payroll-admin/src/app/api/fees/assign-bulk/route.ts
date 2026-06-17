import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// POST - Assign fees to all active students
export async function POST(request: NextRequest) {
  let db: Awaited<ReturnType<typeof getRequestDb>>['db'] | null = null;
  try {
    const resolved = await getRequestDb(request);
    db = resolved.db;
    const body = await request.json();
    const { academic_year, months, fee_structure_ids } = body;

    if (!academic_year || !months || !Array.isArray(months) || months.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Academic year and months are required' },
        { status: 400 }
      );
    }

    // Start transaction
    await db.query('BEGIN');

    // Get all active students with their classes
    const studentsResult = await db.query(`
      SELECT s.id, s.class_id, s.first_name, s.last_name
      FROM students s
      WHERE s.status = 'active'
      ORDER BY s.first_name, s.last_name
    `);

    if (studentsResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'No active students found' },
        { status: 404 }
      );
    }

    let totalAssigned = 0;
    let errors = [];

    // For each student, assign fees
    for (const student of studentsResult.rows) {
      try {
        // Get fee structures for this student's class
        let feeStructuresQuery = `
          SELECT * FROM fee_structures 
          WHERE (class_id = $1 OR class_id IS NULL)
          AND frequency = 'monthly'
          AND is_active = true
          AND academic_year = $2
        `;
        let feeParams = [student.class_id, academic_year];

        // If specific fee structure IDs provided, filter by them
        if (fee_structure_ids && fee_structure_ids.length > 0) {
          feeStructuresQuery += ` AND id = ANY($3)`;
          feeParams.push(fee_structure_ids);
        }

        const feeStructuresResult = await db.query(feeStructuresQuery, feeParams);

        // Assign fees for each month and fee structure
        for (const month of months) {
          for (const feeStructure of feeStructuresResult.rows) {
            // Calculate due date (10th of the month)
            const year = new Date().getFullYear();
            const dueDate = new Date(year, month - 1, 10);

            // Insert fee record (ignore if already exists)
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
                academic_year,
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
      message: `Fee assignment completed`,
      data: {
        studentsProcessed: studentsResult.rows.length,
        feesAssigned: totalAssigned,
        months: months,
        academic_year: academic_year,
        errors: errors
      }
    });
  } catch (error) {
    if (db) {
      await db.query('ROLLBACK').catch(() => {});
    }
    console.error('Error in bulk fee assignment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign fees to students' },
      { status: 500 }
    );
  }
}







