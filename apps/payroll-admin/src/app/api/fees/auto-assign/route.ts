import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// POST - Auto-assign fees to students
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { academic_year, student_ids, fee_structure_ids, force_reassign } = body;

    // Get the current active academic year if not provided
    let currentAcademicYear = academic_year;
    if (!currentAcademicYear) {
      const settingsResult = await db.query('SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1');
      if (settingsResult.rows.length > 0 && settingsResult.rows[0].academic_year) {
        currentAcademicYear = settingsResult.rows[0].academic_year;
      } else {
        return NextResponse.json(
          { success: false, error: 'No academic year specified and no active academic year found' },
          { status: 400 }
        );
      }
    }

    console.log(`🔄 Auto-assigning fees for academic year: ${currentAcademicYear}`);

    // Start transaction
    await db.query('BEGIN');

    // Get active students (if specific students not provided)
    let studentsQuery = `
      SELECT s.id, s.class_id, s.first_name, s.last_name
      FROM students s
      WHERE s.status = 'active'
    `;
    let studentsParams: any[] = [];

    if (student_ids && student_ids.length > 0) {
      studentsQuery += ` AND s.id = ANY($1)`;
      studentsParams.push(student_ids);
    }

    const studentsResult = await db.query(studentsQuery, studentsParams);
    const students = studentsResult.rows;

    if (students.length === 0) {
      await db.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'No active students found' },
        { status: 404 }
      );
    }

    // Get active fee structures
    let feeStructuresQuery = `
      SELECT fs.id, fs.class_id, fs.fee_type, fs.amount, fs.frequency, fs.academic_year
      FROM fee_structures fs
      WHERE fs.is_active = true
      AND (fs.academic_year = $1 OR fs.academic_year = $2 OR fs.academic_year = $3)
    `;
    let feeStructuresParams = [currentAcademicYear, currentAcademicYear.replace('-', '-'), currentAcademicYear.split('-')[0]];

    if (fee_structure_ids && fee_structure_ids.length > 0) {
      feeStructuresQuery += ` AND fs.id = ANY($4)`;
      feeStructuresParams.push(fee_structure_ids);
    }

    const feeStructuresResult = await db.query(feeStructuresQuery, feeStructuresParams);
    const feeStructures = feeStructuresResult.rows;

    if (feeStructures.length === 0) {
      await db.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'No active fee structures found for the academic year' },
        { status: 404 }
      );
    }

    let totalFeesAssigned = 0;
    let studentsProcessed = 0;
    let feesSkipped = 0;

    // Process each student
    for (const student of students) {
      studentsProcessed++;
      
      // Get applicable fee structures for this student's class
      const applicableFeeStructures = feeStructures.filter(fs => 
        fs.class_id === student.class_id || fs.class_id === null
      );

      for (const feeStructure of applicableFeeStructures) {
        // Check if fee is already assigned (unless force reassign)
        if (!force_reassign) {
          const existingFeeCheck = await db.query(
            `SELECT id FROM student_fees 
             WHERE student_id = $1 AND fee_structure_id = $2 AND academic_year = $3
             LIMIT 1`,
            [student.id, feeStructure.id, currentAcademicYear]
          );

          if (existingFeeCheck.rows.length > 0) {
            feesSkipped++;
            continue;
          }
        }

        // Calculate fee amount and frequency
        let feeAmount = parseFloat(feeStructure.amount);
        let monthsToGenerate = 12;

        // Adjust months based on frequency
        switch (feeStructure.frequency) {
          case 'monthly':
            monthsToGenerate = 12;
            break;
          case 'quarterly':
            monthsToGenerate = 4;
            feeAmount = feeAmount / 4; // Quarterly amount divided by 4 for monthly records
            break;
          case 'half_yearly':
            monthsToGenerate = 2;
            feeAmount = feeAmount / 2; // Half-yearly amount divided by 2
            break;
          case 'yearly':
            monthsToGenerate = 1;
            break;
          case 'one_time':
            monthsToGenerate = 1;
            break;
          default:
            monthsToGenerate = 12;
        }

        // Generate fee records for each month/period
        const currentDate = new Date();
        
        // Determine academic year start based on current academic year
        let academicYearStart: Date;
        const academicYearNum = parseInt(currentAcademicYear.split('-')[0]);
        
        if (currentDate.getMonth() >= 3) { // April or later
          academicYearStart = new Date(currentDate.getFullYear(), 3, 1); // April 1st current year
        } else { // January-March
          academicYearStart = new Date(currentDate.getFullYear() - 1, 3, 1); // April 1st previous year
        }
        
        for (let i = 0; i < monthsToGenerate; i++) {
          const dueDate = new Date(academicYearStart);
          dueDate.setMonth(academicYearStart.getMonth() + i);
          dueDate.setDate(10); // 10th of each month

          // Skip if due date is in the past for one-time fees
          if (feeStructure.frequency === 'one_time' && i > 0) {
            continue;
          }

          // For monthly fees, include ALL months from April onwards (don't skip past months)
          // This ensures overdue calculation works correctly

          try {
            await db.query(
              `INSERT INTO student_fees (
                student_id, fee_structure_id, academic_year, amount_due,
                due_date, month, status, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
              ON CONFLICT (student_id, fee_structure_id, academic_year, month) 
              DO UPDATE SET 
                amount_due = EXCLUDED.amount_due,
                updated_at = NOW()`,
              [
                student.id,
                feeStructure.id,
                currentAcademicYear,
                feeAmount,
                dueDate.toISOString().split('T')[0],
                i + 1,
                'pending'
              ]
            );
            totalFeesAssigned++;
          } catch (error) {
            console.error(`Error assigning fee for student ${student.id}, fee structure ${feeStructure.id}:`, error);
          }
        }
      }
    }

    // Commit transaction
    await db.query('COMMIT');

    console.log(`✅ Auto-assignment completed:`, {
      studentsProcessed,
      totalFeesAssigned,
      feesSkipped,
      academicYear: currentAcademicYear
    });

    return NextResponse.json({
      success: true,
      message: `Successfully assigned ${totalFeesAssigned} fee records to ${studentsProcessed} students`,
      data: {
        studentsProcessed,
        totalFeesAssigned,
        feesSkipped,
        academicYear: currentAcademicYear
      }
    });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error in auto-assignment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to auto-assign fees' },
      { status: 500 }
    );
  }
}

// GET - Check assignment status
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const academic_year = searchParams.get('academic_year');

    // Get the current active academic year if not provided
    let currentAcademicYear = academic_year;
    if (!currentAcademicYear) {
      const settingsResult = await db.query('SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1');
      if (settingsResult.rows.length > 0 && settingsResult.rows[0].academic_year) {
        currentAcademicYear = settingsResult.rows[0].academic_year;
      } else {
        return NextResponse.json(
          { success: false, error: 'No academic year specified and no active academic year found' },
          { status: 400 }
        );
      }
    }

    // Get assignment status
    const statusResult = await db.query(
      `WITH active_students AS (
        SELECT s.id, s.class_id, COUNT(*) as student_count
        FROM students s
        WHERE s.status = 'active'
        GROUP BY s.id, s.class_id
      ),
      assigned_fees AS (
        SELECT sf.student_id, COUNT(*) as fee_count
        FROM student_fees sf
        WHERE sf.academic_year = $1
        GROUP BY sf.student_id
      ),
      active_fee_structures AS (
        SELECT COUNT(*) as structure_count
        FROM fee_structures fs
        WHERE fs.is_active = true
        AND (fs.academic_year = $1 OR fs.academic_year = $2 OR fs.academic_year = $3)
      )
      SELECT 
        (SELECT COUNT(*) FROM active_students) as total_students,
        (SELECT COUNT(*) FROM assigned_fees) as students_with_fees,
        (SELECT structure_count FROM active_fee_structures) as active_fee_structures,
        COALESCE(SUM(af.fee_count), 0) as total_fee_records
      FROM active_students ast
      LEFT JOIN assigned_fees af ON ast.id = af.student_id`,
      [currentAcademicYear, currentAcademicYear.replace('-', '-'), currentAcademicYear.split('-')[0]]
    );

    const status = statusResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        academicYear: currentAcademicYear,
        totalStudents: parseInt(status.total_students),
        studentsWithFees: parseInt(status.students_with_fees),
        activeFeeStructures: parseInt(status.active_fee_structures),
        totalFeeRecords: parseInt(status.total_fee_records),
        assignmentComplete: parseInt(status.total_students) === parseInt(status.students_with_fees)
      }
    });

  } catch (error) {
    console.error('Error checking assignment status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check assignment status' },
      { status: 500 }
    );
  }
}
