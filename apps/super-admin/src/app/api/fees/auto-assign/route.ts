import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { FeeGenerationService } from '@/lib/fees/FeeGenerationService';
import { academicYearVariants } from '@/lib/fees/AcademicYear';

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const { academic_year, student_ids, fee_structure_ids, force_reassign } = body;

    let currentAcademicYear = academic_year;
    if (!currentAcademicYear) {
      const settingsResult = await db.query(
        'SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1'
      );
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

    await db.query('BEGIN');

    try {
      const result = await FeeGenerationService.generateSchoolFees(db, {
        academicYear: currentAcademicYear,
        studentIds: student_ids,
        feeStructureIds: fee_structure_ids,
        forceReassign: force_reassign,
      });

      if (result.studentsProcessed === 0) {
        await db.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'No active students found' },
          { status: 404 }
        );
      }

      if (result.totalFeesAssigned === 0 && result.feesSkipped === 0 && !fee_structure_ids) {
        const structures = await db.query(
          `SELECT COUNT(*) as count FROM fee_structures fs
           WHERE fs.is_active = true
           AND (fs.academic_year = $1 OR fs.academic_year = $2 OR fs.academic_year = $3)`,
          academicYearVariants(currentAcademicYear)
        );
        if (parseInt(String(structures.rows[0]?.count ?? 0), 10) === 0) {
          await db.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'No active fee structures found for the academic year' },
            { status: 404 }
          );
        }
      }

      await db.query('COMMIT');

      console.log('✅ Auto-assignment completed:', {
        studentsProcessed: result.studentsProcessed,
        totalFeesAssigned: result.totalFeesAssigned,
        feesSkipped: result.feesSkipped,
        academicYear: currentAcademicYear,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully assigned ${result.totalFeesAssigned} fee records to ${result.studentsProcessed} students`,
        data: {
          studentsProcessed: result.studentsProcessed,
          totalFeesAssigned: result.totalFeesAssigned,
          feesSkipped: result.feesSkipped,
          academicYear: currentAcademicYear,
        },
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error in auto-assignment:', error);
    const message =
      error instanceof Error && error.message.includes('No active fee structures')
        ? error.message
        : 'Failed to auto-assign fees';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const academic_year = searchParams.get('academic_year');

    let currentAcademicYear = academic_year;
    if (!currentAcademicYear) {
      const settingsResult = await db.query(
        'SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1'
      );
      if (settingsResult.rows.length > 0 && settingsResult.rows[0].academic_year) {
        currentAcademicYear = settingsResult.rows[0].academic_year;
      } else {
        return NextResponse.json(
          { success: false, error: 'No academic year specified and no active academic year found' },
          { status: 400 }
        );
      }
    }

    const status = await FeeGenerationService.getAssignmentStatus(db, currentAcademicYear as string);

    return NextResponse.json({
      success: true,
      data: {
        academicYear: status.academicYear,
        totalStudents: status.totalStudents,
        studentsWithFees: status.studentsWithFees,
        activeFeeStructures: status.activeFeeStructures,
        totalFeeRecords: status.totalFeeRecords,
        assignmentComplete: status.assignmentComplete,
      },
    });
  } catch (error) {
    console.error('Error checking assignment status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check assignment status' },
      { status: 500 }
    );
  }
}
