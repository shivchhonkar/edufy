import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureSystemSettings, syncActiveAcademicYear } from '@/lib/ensure-system-settings';
import { FeeGenerationService } from '@/lib/fees/FeeGenerationService';

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

      const assignResult = await FeeGenerationService.generateSchoolFees(db, {
        academicYear: result.rows[0].name,
        forceReassign: false,
        fullYearConflictStrategy: 'ignore',
      });

      console.log(
        `✅ Auto-assignment completed: ${assignResult.totalFeesAssigned} fee records assigned to ${assignResult.studentsProcessed} students`
      );
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


