import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { requireHrAdmin, requireHrRead } from '@/lib/api-auth';
import { ensureExamResultEngineSchema } from '@/lib/ensure-exam-result-engine';
import { fetchPromotionRecommendations } from '@/services/exams/promotion-engine';

export async function GET(request: NextRequest) {
  const auth = requireHrRead(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { db } = await getRequestDb(request);
    await ensureExamResultEngineSchema(db);

    const classId = request.nextUrl.searchParams.get('class_id');
    const examId = request.nextUrl.searchParams.get('exam_id');
    const academicYearId = request.nextUrl.searchParams.get('academic_year_id');

    const data = await fetchPromotionRecommendations(db, {
      class_id: classId ? parseInt(classId, 10) : undefined,
      exam_id: examId ? parseInt(examId, 10) : undefined,
      academic_year_id: academicYearId ? parseInt(academicYearId, 10) : undefined,
    });

    const grouped = {
      PROMOTE: data.filter((r) => r.recommendation === 'PROMOTE'),
      DETAIN: data.filter((r) => r.recommendation === 'DETAIN'),
      REVIEW: data.filter((r) => r.recommendation === 'REVIEW'),
    };

    return NextResponse.json({ success: true, data, grouped });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch recommendations';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireHrAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { db } = await getRequestDb(request);
    await ensureExamResultEngineSchema(db);
    const body = await request.json();
    const { class_id, academic_year_id, max_failed_subjects, minimum_percentage, promote_if_pass } =
      body;

    if (!class_id) {
      return NextResponse.json({ success: false, error: 'class_id is required' }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO promotion_rules (
        class_id, academic_year_id, max_failed_subjects, minimum_percentage, promote_if_pass
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (class_id, academic_year_id) DO UPDATE SET
        max_failed_subjects = EXCLUDED.max_failed_subjects,
        minimum_percentage = EXCLUDED.minimum_percentage,
        promote_if_pass = EXCLUDED.promote_if_pass,
        is_active = true,
        updated_at = NOW()
      RETURNING *`,
      [
        parseInt(String(class_id), 10),
        academic_year_id ? parseInt(String(academic_year_id), 10) : null,
        max_failed_subjects ?? 0,
        minimum_percentage ?? 33,
        promote_if_pass ?? true,
      ],
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save promotion rule';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
