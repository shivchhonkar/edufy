import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { parseStudentId } from '@/lib/student-profile-api';
import {
  classExists,
  getAcademicYearById,
  getActiveAcademicYear,
  isValidPromotionAction,
  promoteStudent,
  sectionBelongsToClass,
  type PromotionAction,
} from '@/lib/promotion-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const studentId = parseStudentId(params.id);
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 });
    }

    const body = await request.json();
    const {
      target_class_id,
      target_section_id = null,
      academic_year_id = null,
      academic_year,
      promotion_action = 'promoted',
      roll_number,
      preserve_roll_number = true,
    } = body as {
      target_class_id: number;
      target_section_id?: number | null;
      academic_year_id?: number | null;
      academic_year?: string;
      promotion_action?: PromotionAction;
      roll_number?: string | null;
      preserve_roll_number?: boolean;
    };

    if (!target_class_id) {
      return NextResponse.json(
        { success: false, error: 'target_class_id is required' },
        { status: 400 }
      );
    }

    if (!isValidPromotionAction(promotion_action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid promotion_action' },
        { status: 400 }
      );
    }

    if (!(await classExists(db, target_class_id))) {
      return NextResponse.json({ success: false, error: 'Target class not found' }, { status: 404 });
    }

    if (
      target_section_id &&
      !(await sectionBelongsToClass(db, target_section_id, target_class_id))
    ) {
      return NextResponse.json(
        { success: false, error: 'Target section does not belong to target class' },
        { status: 400 }
      );
    }

    let resolvedAcademicYearId = academic_year_id;
    let resolvedAcademicYear = academic_year?.trim() ?? '';

    if (resolvedAcademicYearId) {
      const yearRow = await getAcademicYearById(db, resolvedAcademicYearId);
      if (!yearRow) {
        return NextResponse.json(
          { success: false, error: 'Academic year not found' },
          { status: 404 }
        );
      }
      resolvedAcademicYear = yearRow.name;
    } else if (!resolvedAcademicYear) {
      const activeYear = await getActiveAcademicYear(db);
      if (!activeYear) {
        return NextResponse.json(
          { success: false, error: 'No active academic year. Provide academic_year_id or academic_year.' },
          { status: 400 }
        );
      }
      resolvedAcademicYearId = activeYear.id;
      resolvedAcademicYear = activeYear.name;
    }

    const result = await promoteStudent(db, {
      studentId,
      targetClassId: target_class_id,
      targetSectionId: target_section_id,
      targetAcademicYearId: resolvedAcademicYearId,
      targetAcademicYear: resolvedAcademicYear,
      promotionAction: promotion_action,
      rollNumber: roll_number,
      preserveRollNumber: preserve_roll_number,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Promotion failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Student promoted successfully',
    });
  } catch (error) {
    console.error('Error promoting student:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to promote student' },
      { status: 500 }
    );
  }
}
