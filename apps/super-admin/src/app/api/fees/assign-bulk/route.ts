import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { FeeGenerationService } from '@/lib/fees/FeeGenerationService';

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { academic_year, months, fee_structure_ids } = body;

    if (!academic_year || !months || !Array.isArray(months) || months.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Academic year and months are required' },
        { status: 400 }
      );
    }

    await db.query('BEGIN');

    try {
      const result = await FeeGenerationService.generateSchoolFees(db, {
        academicYear: academic_year,
        months,
        feeStructureIds: fee_structure_ids,
        monthlyOnly: true,
        conflictStrategy: 'ignore',
      });

      if (result.studentsProcessed === 0) {
        await db.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'No active students found' },
          { status: 404 }
        );
      }

      await db.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Fee assignment completed',
        data: {
          studentsProcessed: result.studentsProcessed,
          feesAssigned: result.totalFeesAssigned,
          months,
          academic_year,
          errors: result.errors,
        },
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error in bulk fee assignment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign fees to students' },
      { status: 500 }
    );
  }
}
