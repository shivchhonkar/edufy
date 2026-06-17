import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { bulkUpdateFees } from '@/lib/fee-manager';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import { classNameOrderSql } from '@/lib/class-sort';
import type { RequestDb } from '@/lib/request-db';

// Function to automatically clean up duplicate fee structures (per class only)
async function autoCleanupDuplicateFeeStructures(db: RequestDb, academicYear: string) {
  try {
    const duplicates = await db.query(`
      SELECT 
        fee_type,
        amount,
        academic_year,
        COALESCE(class_id, 0) as class_id,
        COUNT(*) as structure_count,
        STRING_AGG(id::text, ', ') as structure_ids,
        STRING_AGG(CASE WHEN is_active THEN id::text END, ', ') as active_ids,
        STRING_AGG(CASE WHEN NOT is_active THEN id::text END, ', ') as inactive_ids
      FROM fee_structures
      WHERE academic_year = $1
      GROUP BY fee_type, amount, academic_year, COALESCE(class_id, 0)
      HAVING COUNT(*) > 1
      ORDER BY fee_type, amount
    `, [academicYear]);
    
    let totalCleaned = 0;
    
    for (const dup of duplicates.rows) {
      const activeIds = dup.active_ids ? dup.active_ids.split(', ').map(id => parseInt(id)) : [];
      const inactiveIds = dup.inactive_ids ? dup.inactive_ids.split(', ').map(id => parseInt(id)) : [];
      
      if (activeIds.length === 1) {
        // Keep the active one, delete inactive ones
        for (const inactiveId of inactiveIds) {
          const deleteResult = await db.query(
            `DELETE FROM fee_structures WHERE id = $1`,
            [inactiveId]
          );
          totalCleaned += deleteResult.rowCount;
        }
      } else if (activeIds.length === 0 && inactiveIds.length > 1) {
        // Keep the first inactive one, delete others
        const keepId = inactiveIds[0];
        const deleteIds = inactiveIds.slice(1);
        
        for (const deleteId of deleteIds) {
          const deleteResult = await db.query(
            `DELETE FROM fee_structures WHERE id = $1`,
            [deleteId]
          );
          totalCleaned += deleteResult.rowCount;
        }
      } else if (activeIds.length > 1) {
        // Keep the first active one, deactivate others and delete inactive ones
        const keepId = activeIds[0];
        const otherActiveIds = activeIds.slice(1);
        
        // Deactivate other active structures
        for (const otherActiveId of otherActiveIds) {
          await db.query(
            `UPDATE fee_structures SET is_active = false WHERE id = $1`,
            [otherActiveId]
          );
        }
        
        // Delete inactive structures
        for (const inactiveId of inactiveIds) {
          const deleteResult = await db.query(
            `DELETE FROM fee_structures WHERE id = $1`,
            [inactiveId]
          );
          totalCleaned += deleteResult.rowCount;
        }
      }
    }
    
    if (totalCleaned > 0) {
      console.log(`🧹 Auto-cleaned ${totalCleaned} duplicate fee structures`);
    }
    
    return totalCleaned;
  } catch (error) {
    console.error('❌ Error in auto-cleanup of duplicate fee structures:', error);
    return 0;
  }
}

// GET fee structures
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);
    const searchParams = request.nextUrl.searchParams;
    const academicYear = await resolveAcademicYear(db, searchParams.get('academic_year'));
    
    // Auto-cleanup duplicate fee structures if needed
    try {
      const duplicatesCleaned = await autoCleanupDuplicateFeeStructures(db, academicYear);
      if (duplicatesCleaned > 0) {
        console.log(`🔧 Auto-cleaned ${duplicatesCleaned} duplicate fee structures`);
      }
    } catch (error) {
      console.error('❌ Error in auto-cleanup of duplicate fee structures:', error);
      // Don't fail the request if cleanup fails
    }
    const classId = searchParams.get('class_id');
    const categoryId = searchParams.get('category_id');
    const isActive = searchParams.get('is_active');

    let queryText = `
      SELECT fs.*, c.name as class_name, fc.name as category_name
      FROM fee_structures fs
      LEFT JOIN classes c ON fs.class_id = c.id
      LEFT JOIN fee_categories fc ON fs.category_id = fc.id
      WHERE 1=1
    `;
    let queryParams: any[] = [];
    let paramCount = 0;

    if (classId) {
      paramCount++;
      queryText += ` AND fs.class_id = $${paramCount}`;
      queryParams.push(classId);
    }

    if (categoryId) {
      paramCount++;
      queryText += ` AND fs.category_id = $${paramCount}`;
      queryParams.push(categoryId);
    }

    if (academicYear) {
      paramCount++;
      queryText += ` AND fs.academic_year = $${paramCount}`;
      queryParams.push(academicYear);
    }

    if (isActive) {
      paramCount++;
      queryText += ` AND fs.is_active = $${paramCount}`;
      queryParams.push(isActive === 'true');
    }

    queryText += ` ORDER BY ${classNameOrderSql('c.name', { nullsFirst: true, prioritizeNull: true })}, fs.fee_type ASC, fs.created_at DESC`;

    const result = await db.query(queryText, queryParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching fee structures:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee structures' },
      { status: 500 }
    );
  }
}

async function autoAssignFeeStructureToStudents(
  db: Awaited<ReturnType<typeof getRequestDb>>['db'],
  feeStructureId: number,
  classId: number | null,
  feeType: string,
  amount: number,
  frequency: string,
  academicYear: string
) {
  try {
    console.log(`🎯 Auto-assigning new fee structure "${feeType}" to existing students`);

    const studentsQuery = classId
      ? `SELECT id FROM students WHERE status = 'active' AND class_id = $1`
      : `SELECT id FROM students WHERE status = 'active'`;

    const studentsParams = classId ? [classId] : [];
    const studentsResult = await db.query(studentsQuery, studentsParams);
    const students = studentsResult.rows;

    let feesAssigned = 0;
    const currentDate = new Date();

    let academicYearStart: Date;
    if (currentDate.getMonth() >= 3) {
      academicYearStart = new Date(currentDate.getFullYear(), 3, 1);
    } else {
      academicYearStart = new Date(currentDate.getFullYear() - 1, 3, 1);
    }

    for (const student of students) {
      let feeAmount = parseFloat(String(amount));
      let monthsToGenerate = 12;

      switch (frequency) {
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

      for (let i = 0; i < monthsToGenerate; i++) {
        const dueDate = new Date(academicYearStart);
        dueDate.setMonth(academicYearStart.getMonth() + i);
        dueDate.setDate(10);

        if (frequency === 'one_time' && i > 0) continue;

        try {
          await db.query(
            `INSERT INTO student_fees (
              student_id, fee_structure_id, academic_year, amount_due,
              due_date, month, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (student_id, fee_structure_id, academic_year, month)
            DO NOTHING`,
            [
              student.id,
              feeStructureId,
              academicYear,
              feeAmount,
              dueDate.toISOString().split('T')[0],
              i + 1,
              'pending',
            ]
          );
          feesAssigned++;
        } catch (error) {
          console.error(`Error assigning fee to student ${student.id}:`, error);
        }
      }
    }

    console.log(`✅ Auto-assigned ${feesAssigned} fee records for new fee structure "${feeType}"`);
    return feesAssigned;
  } catch (autoAssignError) {
    console.error('Error auto-assigning fees for new fee structure:', autoAssignError);
    return 0;
  }
}

async function createSingleFeeStructure(
  db: Awaited<ReturnType<typeof getRequestDb>>['db'],
  params: {
    class_id: number | null;
    category_id: number | null;
    fee_type: string;
    amount: number;
    frequency: string;
    academic_year: string;
    description: string | null;
    late_fee_percentage: number;
    late_fee_days: number;
    is_active: boolean;
  }
) {
  try {
    const duplicateCheck = await db.query(
      `SELECT id FROM fee_structures
       WHERE fee_type = $1
       AND COALESCE(class_id, 0) = COALESCE($2, 0)
       AND academic_year = $3
       AND frequency = $4
       LIMIT 1`,
      [params.fee_type, params.class_id, params.academic_year, params.frequency]
    );

    if (duplicateCheck.rows.length > 0) {
      return { error: `Already exists for class ${params.class_id ?? 'All Classes'}` };
    }

    const result = await db.query(
      `INSERT INTO fee_structures (
        class_id, category_id, fee_type, amount, frequency,
        academic_year, description, late_fee_percentage,
        late_fee_days, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        params.class_id,
        params.category_id,
        params.fee_type.trim(),
        params.amount,
        params.frequency,
        params.academic_year,
        params.description,
        params.late_fee_percentage || 0,
        params.late_fee_days || 7,
        params.is_active !== false,
      ]
    );

    if (params.is_active !== false) {
      await autoAssignFeeStructureToStudents(
        db,
        result.rows[0].id,
        params.class_id,
        params.fee_type,
        params.amount,
        params.frequency,
        params.academic_year
      );
    }

    return { data: result.rows[0] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Insert failed';
    return { error: message };
  }
}

// POST create fee structure (supports class_ids array for bulk creation)
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);
    const body = await request.json();
    const {
      class_id,
      class_ids,
      category_id,
      fee_type,
      amount,
      frequency,
      academic_year,
      description,
      late_fee_percentage,
      late_fee_days,
      is_active,
    } = body;

    if (!fee_type || amount == null || !frequency || !academic_year) {
      return NextResponse.json(
        { success: false, error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    const baseParams = {
      category_id: category_id || null,
      fee_type: String(fee_type).trim(),
      amount: parseFloat(String(amount)),
      frequency,
      academic_year,
      description: description || null,
      late_fee_percentage: late_fee_percentage ?? 0,
      late_fee_days: late_fee_days ?? 7,
      is_active: is_active !== false,
    };

    const targetClassIds: (number | null)[] = Array.isArray(class_ids) && class_ids.length > 0
      ? class_ids.map((id: number | string) => parseInt(String(id), 10))
      : [class_id ? parseInt(String(class_id), 10) : null];

    const created: unknown[] = [];
    const skipped: string[] = [];

    for (const cid of targetClassIds) {
      const result = await createSingleFeeStructure(db, {
        ...baseParams,
        class_id: cid,
      });
      if (result.error) {
        skipped.push(result.error);
      } else if (result.data) {
        created.push(result.data);
      }
    }

    if (created.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: skipped.length
            ? `Fee structure already exists for all selected classes. ${skipped.join('; ')}`
            : 'Failed to create fee structure',
        },
        { status: 409 }
      );
    }

    const message = created.length > 1
      ? `Created ${created.length} fee structures${skipped.length ? ` (${skipped.length} skipped as duplicates)` : ''}`
      : `Fee structure created successfully${is_active !== false ? ' and assigned to existing students' : ''}`;

    return NextResponse.json({
      success: true,
      data: created.length === 1 ? created[0] : created,
      created_count: created.length,
      skipped_count: skipped.length,
      message,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating fee structure:', error);
    const message = error instanceof Error ? error.message : 'Failed to create fee structure';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// PUT update fee structure
export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);
    const body = await request.json();
    const {
      id,
      class_id,
      category_id,
      fee_type,
      amount,
      frequency,
      academic_year,
      description,
      late_fee_percentage,
      late_fee_days,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Fee structure ID is required' },
        { status: 400 }
      );
    }

    // Get the old fee structure to check if amount changed
    const oldStructureResult = await db.query(
      'SELECT amount FROM fee_structures WHERE id = $1',
      [id]
    );

    if (oldStructureResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Fee structure not found' },
        { status: 404 }
      );
    }

    const oldAmount = parseFloat(oldStructureResult.rows[0].amount);
    const newAmount = parseFloat(amount);

    // Update the fee structure
    const result = await db.query(
      `UPDATE fee_structures SET
        class_id = $1,
        category_id = $2,
        fee_type = $3,
        amount = $4,
        frequency = $5,
        academic_year = $6,
        description = $7,
        late_fee_percentage = $8,
        late_fee_days = $9,
        is_active = $10
      WHERE id = $11
      RETURNING *`,
      [
        class_id, category_id, fee_type, amount, frequency,
        academic_year, description, late_fee_percentage,
        late_fee_days, is_active, id
      ]
    );

    let updatedStudentFeesCount = 0;

    // If amount changed, use unified fee manager to update all student fees
    if (oldAmount !== newAmount) {
      console.log(`💰 Fee structure amount changed from ₹${oldAmount} to ₹${newAmount}`);
      console.log(`🔄 Using unified fee manager for system-wide update...`);
      
      try {
        // Use the unified bulk update function
        const updateResult = await bulkUpdateFees({
          feeType: fee_type,
          classId: class_id,
          newAmount,
          academicYear: academic_year,
          updateExistingFees: true
        });

        if (updateResult.success) {
          updatedStudentFeesCount = updateResult.updatedCount;
          console.log(`✅ ${updateResult.message}`);
          console.log(`   - Fee structure: ₹${oldAmount} → ₹${newAmount}`);
          console.log(`   - Records updated: ${updateResult.updatedCount}`);
          console.log(`   - Students affected: ${updateResult.affectedStudents}`);
          console.log(`   - All systems automatically synced ✅`);
        } else {
          console.error(`⚠️  Bulk update completed with warnings: ${updateResult.message}`);
          if (updateResult.error) {
            console.error(`   Error: ${updateResult.error}`);
          }
        }

      } catch (studentFeeError: any) {
        console.error('Error updating student fees:', studentFeeError);
        console.log('   Fee structure updated but student fees may need manual sync');
        // Continue with fee structure update even if student fee update fails
      }
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: `Fee structure updated successfully${oldAmount !== newAmount ? ` and ${updatedStudentFeesCount} student fees updated` : ''}`,
    });
  } catch (error) {
    console.error('Error updating fee structure:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update fee structure' },
      { status: 500 }
    );
  }
}

// DELETE fee structure
export async function DELETE(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Fee structure ID is required' },
        { status: 400 }
      );
    }

    // Check if fee structure exists
    const feeCheck = await db.query('SELECT fee_type, class_id FROM fee_structures WHERE id = $1', [id]);
    if (feeCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Fee structure not found' },
        { status: 404 }
      );
    }

    const feeStructure = feeCheck.rows[0];

    // Check if there are any student fees using this structure
    const studentFeesCheck = await db.query(
      'SELECT COUNT(*) as count FROM student_fees WHERE fee_structure_id = $1',
      [id]
    );

    const studentFeesCount = parseInt(studentFeesCheck.rows[0].count);

    if (studentFeesCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete this fee structure because it is being used by ${studentFeesCount} student fee record(s). Please deactivate it instead by editing the fee structure and unchecking "Enable this fee".`,
          hasStudentFees: true,
          studentFeesCount: studentFeesCount
        },
        { status: 409 }
      );
    }

    // Safe to delete - no student fees are using it
    await db.query('DELETE FROM fee_structures WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Fee structure deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting fee structure:', error);
    
    // Check if it's a foreign key constraint error
    if (error.code === '23503') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete this fee structure because it is being used by student records. Please deactivate it instead by editing the fee structure and unchecking "Enable this fee".',
          hasStudentFees: true
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to delete fee structure' },
      { status: 500 }
    );
  }
}

