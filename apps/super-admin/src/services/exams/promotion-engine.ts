import type { RequestDb } from '@/lib/request-db';
import type { StudentExamSummaryRow } from '@/lib/ensure-exam-result-engine';

export type PromotionRecommendation = 'PROMOTE' | 'DETAIN' | 'REVIEW';

type PromotionRule = {
  max_failed_subjects: number;
  minimum_percentage: string | number;
  promote_if_pass: boolean;
};

async function loadPromotionRule(
  db: RequestDb,
  classId: number,
  academicYearId: number | null,
): Promise<PromotionRule> {
  const result = await db.query<PromotionRule>(
    `SELECT max_failed_subjects, minimum_percentage, promote_if_pass
     FROM promotion_rules
     WHERE class_id = $1 AND is_active = true
       AND (academic_year_id IS NULL OR academic_year_id = $2)
     ORDER BY academic_year_id DESC NULLS LAST
     LIMIT 1`,
    [classId, academicYearId],
  );

  return (
    result.rows[0] ?? {
      max_failed_subjects: 0,
      minimum_percentage: 33,
      promote_if_pass: true,
    }
  );
}

function decideRecommendation(
  summary: Pick<
    StudentExamSummaryRow,
    'result_status' | 'failed_subjects' | 'percentage'
  >,
  rule: PromotionRule,
): PromotionRecommendation {
  const minPct = parseFloat(String(rule.minimum_percentage));
  const pct = parseFloat(String(summary.percentage));

  if (rule.promote_if_pass && summary.result_status === 'PASS' && pct >= minPct) {
    return 'PROMOTE';
  }

  if (summary.failed_subjects > rule.max_failed_subjects || pct < minPct) {
    return 'DETAIN';
  }

  return 'REVIEW';
}

export async function generatePromotionRecommendations(
  db: RequestDb,
  examId: number,
  tenantId?: number | null,
): Promise<number> {
  const examRes = await db.query<{ class_id: number; academic_year_id: number | null }>(
    `SELECT class_id, academic_year_id FROM exams WHERE id = $1`,
    [examId],
  );
  const exam = examRes.rows[0];
  if (!exam) return 0;

  const summaries = await db.query<StudentExamSummaryRow>(
    `SELECT * FROM student_exam_summary WHERE exam_id = $1`,
    [examId],
  );

  const rule = await loadPromotionRule(db, exam.class_id, exam.academic_year_id);
  let count = 0;

  for (const summary of summaries.rows) {
    const recommendation = decideRecommendation(summary, rule);
    await db.query(
      `INSERT INTO student_promotion_recommendations (
        tenant_id, academic_year_id, exam_id, student_id, class_id, section_id,
        recommendation, percentage, failed_subjects, summary_id, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (student_id, academic_year_id, exam_id) DO UPDATE SET
        recommendation = EXCLUDED.recommendation,
        percentage = EXCLUDED.percentage,
        failed_subjects = EXCLUDED.failed_subjects,
        summary_id = EXCLUDED.summary_id,
        updated_at = NOW()`,
      [
        tenantId ?? null,
        summary.academic_year_id,
        examId,
        summary.student_id,
        summary.class_id,
        summary.section_id,
        recommendation,
        summary.percentage,
        summary.failed_subjects,
        summary.id,
      ],
    );
    count += 1;
  }

  return count;
}

export async function fetchPromotionRecommendations(
  db: RequestDb,
  filters: { class_id?: number; exam_id?: number; academic_year_id?: number },
) {
  let query = `
    SELECT spr.*, s.first_name, s.last_name, s.admission_number, s.roll_number,
           sec.name AS section_name, c.name AS class_name
    FROM student_promotion_recommendations spr
    JOIN students s ON s.id = spr.student_id
    JOIN classes c ON c.id = spr.class_id
    LEFT JOIN sections sec ON sec.id = spr.section_id
    WHERE 1=1`;
  const params: number[] = [];

  if (filters.class_id) {
    params.push(filters.class_id);
    query += ` AND spr.class_id = $${params.length}`;
  }
  if (filters.exam_id) {
    params.push(filters.exam_id);
    query += ` AND spr.exam_id = $${params.length}`;
  }
  if (filters.academic_year_id) {
    params.push(filters.academic_year_id);
    query += ` AND spr.academic_year_id = $${params.length}`;
  }

  query += ` ORDER BY spr.recommendation, s.first_name, s.last_name`;
  const result = await db.query(query, params);
  return result.rows;
}
