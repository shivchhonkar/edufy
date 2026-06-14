import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureSystemSettings, syncActiveAcademicYear } from '@/lib/ensure-system-settings';

// POST - Activate an academic year
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureSystemSettings(db);
    const yearId = params.id;

    await db.query('UPDATE academic_years SET is_active = false', []);

    // Activate the selected academic year
    const result = await db.query(
      `UPDATE academic_years 
       SET is_active = true, updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [yearId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Academic year not found' },
        { status: 404 }
      );
    }

    await syncActiveAcademicYear(db, result.rows[0].name);

    // Auto-assign fees to all active students for the new academic year
    try {
      console.log(`🎯 Auto-assigning fees for newly activated academic year: ${result.rows[0].name}`);
      
      // Get active students
      const studentsResult = await db.query(
        `SELECT s.id, s.class_id, s.first_name, s.last_name
         FROM students s
         WHERE s.status = 'active'`
      );

      // Get active fee structures for the academic year
      const feeStructuresResult = await db.query(
        `SELECT fs.id, fs.class_id, fs.fee_type, fs.amount, fs.frequency
         FROM fee_structures fs
         WHERE fs.is_active = true
         AND (fs.academic_year = $1 OR fs.academic_year = $2 OR fs.academic_year = $3)`,
        [result.rows[0].name, result.rows[0].name.replace('-', '-'), result.rows[0].name.split('-')[0]]
      );

      let totalFeesAssigned = 0;
      const students = studentsResult.rows;
      const feeStructures = feeStructuresResult.rows;

      // Process each student
      for (const student of students) {
        const applicableFeeStructures = feeStructures.filter(fs => 
          fs.class_id === student.class_id || fs.class_id === null
        );

        for (const feeStructure of applicableFeeStructures) {
          // Check if fee is already assigned
          const existingFeeCheck = await db.query(
            `SELECT id FROM student_fees 
             WHERE student_id = $1 AND fee_structure_id = $2 AND academic_year = $3
             LIMIT 1`,
            [student.id, feeStructure.id, result.rows[0].name]
          );

          if (existingFeeCheck.rows.length > 0) {
            continue; // Skip if already assigned
          }

          // Calculate fee amount based on frequency
          let feeAmount = parseFloat(feeStructure.amount);
          let monthsToGenerate = 12;

          switch (feeStructure.frequency) {
            case 'monthly':
              monthsToGenerate = 12;
              break;
            case 'quarterly':
              monthsToGenerate = 4;
              feeAmount = feeAmount / 4;
              break;
            case 'half_yearly':
              monthsToGenerate = 2;
              feeAmount = feeAmount / 2;
              break;
            case 'yearly':
            case 'one_time':
              monthsToGenerate = 1;
              break;
          }

          // Generate fee records
          const currentDate = new Date();
          const academicYearStart = new Date(currentDate.getFullYear(), 3, 1); // April 1st
          
          for (let i = 0; i < monthsToGenerate; i++) {
            const dueDate = new Date(academicYearStart);
            dueDate.setMonth(academicYearStart.getMonth() + i);
            dueDate.setDate(10);

            if (feeStructure.frequency === 'one_time' && i > 0) continue;

            await db.query(
              `INSERT INTO student_fees (
                student_id, fee_structure_id, academic_year, amount_due,
                due_date, month, status, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
              ON CONFLICT (student_id, fee_structure_id, academic_year, month) 
              DO NOTHING`,
              [
                student.id,
                feeStructure.id,
                result.rows[0].name,
                feeAmount,
                dueDate.toISOString().split('T')[0],
                i + 1,
                'pending'
              ]
            );
            totalFeesAssigned++;
          }
        }
      }

      console.log(`✅ Auto-assignment completed: ${totalFeesAssigned} fee records assigned to ${students.length} students`);
    } catch (autoAssignError) {
      console.error('Error in auto-assignment during academic year activation:', autoAssignError);
      // Don't fail the academic year activation if auto-assignment fails
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: `Academic year "${result.rows[0].name}" activated successfully. Fees will be automatically assigned to students.`
    });
  } catch (error: any) {
    console.error('Error activating academic year:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


