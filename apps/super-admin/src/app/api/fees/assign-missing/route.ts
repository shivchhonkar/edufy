import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { FeeGenerationService } from '@/lib/fees/FeeGenerationService';

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json().catch(() => ({}));
    const { academic_year } = body;

    const currentYear = academic_year || new Date().getFullYear().toString();
    const currentMonth = new Date().getMonth() + 1;
    const months = [currentMonth, currentMonth + 1, currentMonth + 2].filter((m) => m <= 12);

    await db.query('BEGIN');

    try {
      const result = await FeeGenerationService.generateSchoolFees(db, {
        academicYear: currentYear,
        months,
        onlyStudentsWithoutFees: true,
        monthlyOnly: true,
        conflictStrategy: 'ignore',
      });

      await db.query('COMMIT');

      if (result.studentsProcessed === 0) {
        return NextResponse.json({
          success: true,
          message: 'All students already have fee records assigned',
          data: {
            studentsProcessed: 0,
            feesAssigned: 0,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Assigned fees to ${result.studentsProcessed} students who were missing fee records`,
        data: {
          studentsProcessed: result.studentsProcessed,
          feesAssigned: result.totalFeesAssigned,
          academic_year: currentYear,
          errors: result.errors,
        },
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error assigning missing fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign missing fees' },
      { status: 500 }
    );
  }
}
