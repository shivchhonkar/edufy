import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import {
  classExists,
  fetchEligibleStudents,
  getAcademicYearById,
  getActiveAcademicYear,
  isValidPromotionAction,
  promoteStudentsBulk,
  sectionBelongsToClass,
  type PromotionAction,
} from '@/lib/promotion-service';

interface BulkPromotionBody {
  student_ids?: number[];
  source_class_id: number;
  source_section_id?: number | null;
  target_class_id: number;
  target_section_id?: number | null;
  academic_year_id?: number | null;
  academic_year?: string;
  promotion_action?: PromotionAction;
  preserve_roll_numbers?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = (await request.json()) as BulkPromotionBody;

    const {
      student_ids,
      source_class_id,
      source_section_id = null,
      target_class_id,
      target_section_id = null,
      academic_year_id = null,
      academic_year,
      promotion_action = 'promoted',
      preserve_roll_numbers = true,
    } = body;

    if (!source_class_id || !target_class_id) {
      return NextResponse.json(
        { success: false, error: 'source_class_id and target_class_id are required' },
        { status: 400 }
      );
    }

    if (!isValidPromotionAction(promotion_action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid promotion_action' },
        { status: 400 }
      );
    }

    if (!(await classExists(db, source_class_id))) {
      return NextResponse.json({ success: false, error: 'Source class not found' }, { status: 404 });
    }

    if (!(await classExists(db, target_class_id))) {
      return NextResponse.json({ success: false, error: 'Target class not found' }, { status: 404 });
    }

    if (
      source_section_id &&
      !(await sectionBelongsToClass(db, source_section_id, source_class_id))
    ) {
      return NextResponse.json(
        { success: false, error: 'Source section does not belong to source class' },
        { status: 400 }
      );
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

    const eligible = await fetchEligibleStudents(db, source_class_id, source_section_id);
    const eligibleIds = new Set(eligible.map((s) => s.id));

    let targetStudentIds: number[];
    if (student_ids && student_ids.length > 0) {
      targetStudentIds = student_ids.filter((id) => eligibleIds.has(id));
      if (targetStudentIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No selected students are eligible for promotion from this class/section' },
          { status: 400 }
        );
      }
    } else {
      targetStudentIds = eligible.map((s) => s.id);
      if (targetStudentIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No active students found in the selected class/section' },
          { status: 400 }
        );
      }
    }

    const inputs = targetStudentIds.map((studentId) => ({
      studentId,
      targetClassId: target_class_id,
      targetSectionId: target_section_id,
      targetAcademicYearId: resolvedAcademicYearId,
      targetAcademicYear: resolvedAcademicYear,
      promotionAction: promotion_action,
      preserveRollNumber: preserve_roll_numbers,
    }));

    const results = await promoteStudentsBulk(db, inputs);
    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return NextResponse.json({
      success: failed.length === 0,
      data: {
        promoted: succeeded.length,
        failed: failed.length,
        results,
        academic_year: resolvedAcademicYear,
        target_class_id: target_class_id,
        target_section_id: target_section_id,
      },
      message:
        failed.length === 0
          ? `Successfully promoted ${succeeded.length} student(s)`
          : `Promoted ${succeeded.length} student(s); ${failed.length} failed`,
    });
  } catch (error) {
    console.error('Error processing bulk promotion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process bulk promotion' },
      { status: 500 }
    );
  }
}
