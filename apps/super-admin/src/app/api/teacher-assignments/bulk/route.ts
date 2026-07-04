import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin } from '@/lib/hr-auth';

interface BulkAssignmentInput {
  staff_id: number;
  class_id: number;
  section_id?: number | null;
  subject_id?: number | null;
  academic_year: string;
  is_class_teacher?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const body = await request.json();
    const assignments = body.assignments as BulkAssignmentInput[] | undefined;

    if (!assignments?.length) {
      return NextResponse.json(
        { success: false, error: 'At least one assignment is required' },
        { status: 400 },
      );
    }

    const created: unknown[] = [];
    const errors: string[] = [];

    for (const item of assignments) {
      if (!item.staff_id || !item.class_id || !item.academic_year) {
        errors.push('Each assignment requires staff_id, class_id, and academic_year');
        continue;
      }

      try {
        if (item.is_class_teacher && item.section_id) {
          await db
            .query(`UPDATE sections SET class_teacher_id = $1 WHERE id = $2`, [
              item.staff_id,
              item.section_id,
            ])
            .catch(() => {});
        }

        const result = await db.query(
          `INSERT INTO teacher_assignments (staff_id, class_id, section_id, subject_id, academic_year, is_class_teacher)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (staff_id, class_id, section_id, subject_id, academic_year)
           DO UPDATE SET is_class_teacher = $6
           RETURNING *`,
          [
            item.staff_id,
            item.class_id,
            item.section_id || null,
            item.subject_id || null,
            item.academic_year,
            item.is_class_teacher ?? false,
          ],
        );
        created.push(result.rows[0]);
      } catch (error) {
        console.error('Bulk assignment item error:', error);
        errors.push(`Failed for staff ${item.staff_id}, class ${item.class_id}`);
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      data: { created_count: created.length, created },
      errors: errors.length ? errors : undefined,
      message: `${created.length} assignment(s) saved${errors.length ? `, ${errors.length} failed` : ''}`,
    });
  } catch (error) {
    console.error('Bulk teacher assignment error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save bulk assignments' },
      { status: 500 },
    );
  }
}
