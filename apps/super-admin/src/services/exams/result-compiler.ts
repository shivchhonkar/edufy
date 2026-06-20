import type { RequestDb } from '@/lib/request-db';
import type { CompileExamResult } from '@/lib/ensure-exam-result-engine';
import { fetchExamSubjects } from '@/lib/ensure-exams-schema';
import { evaluateStudentResult, loadGradingScale } from '@/services/exams/grading-engine';
import { computeRanks, type RankCandidate } from '@/services/exams/ranking-engine';
import { logExamResultAudit } from '@/services/exams/exam-audit';
import { generatePromotionRecommendations } from '@/services/exams/promotion-engine';

type ExamRow = {
  id: number;
  class_id: number;
  academic_year_id: number | null;
  minimum_overall_percentage: string | number;
  exam_type: string;
};

async function resolveAcademicYearId(db: RequestDb, exam: ExamRow): Promise<number | null> {
  if (exam.academic_year_id) return exam.academic_year_id;
  const active = await db.query<{ id: number }>(
    `SELECT id FROM academic_years WHERE is_active = true ORDER BY id DESC LIMIT 1`,
  );
  return active.rows[0]?.id ?? null;
}

export async function compileExamResults(
  db: RequestDb,
  examId: number,
  compiledBy: number,
  tenantId?: number | null,
): Promise<CompileExamResult> {
  const examRes = await db.query<ExamRow>(
    `SELECT id, class_id, academic_year_id, minimum_overall_percentage, exam_type
     FROM exams WHERE id = $1`,
    [examId],
  );
  const exam = examRes.rows[0];
  if (!exam) throw new Error('Exam not found');

  const subjects = await fetchExamSubjects(db, examId);
  if (subjects.length === 0) throw new Error('Exam has no subjects configured');

  const subjectIds = subjects.map((s) => s.subject_id);
  const minOverall = parseFloat(String(exam.minimum_overall_percentage ?? 33));
  const scale = await loadGradingScale(db);
  const academicYearId = await resolveAcademicYearId(db, exam);

  const studentsRes = await db.query<{
    id: number;
    class_id: number;
    section_id: number | null;
    first_name: string;
    last_name: string;
  }>(
    `SELECT id, class_id, section_id, first_name, last_name
     FROM students
     WHERE status = 'active' AND class_id = $1`,
    [exam.class_id],
  );

  const resultsRes = await db.query<{
    student_id: number;
    subject_id: number;
    marks_obtained: string;
    is_absent: boolean;
  }>(
    `SELECT er.student_id, COALESCE(er.subject_id, e.subject_id) AS subject_id,
            er.marks_obtained, er.is_absent
     FROM exam_results er
     JOIN exams e ON e.id = er.exam_id
     WHERE er.exam_id = $1`,
    [examId],
  );

  const marksByStudent = new Map<number, Map<number, { marks: number; absent: boolean }>>();
  for (const row of resultsRes.rows) {
    if (!row.subject_id) continue;
    if (!marksByStudent.has(row.student_id)) marksByStudent.set(row.student_id, new Map());
    marksByStudent.get(row.student_id)!.set(row.subject_id, {
      marks: parseFloat(row.marks_obtained || '0'),
      absent: row.is_absent,
    });
  }

  const subjectMeta = new Map(
    subjects.map((s) => [
      s.subject_id,
      { max: s.total_marks, pass: s.passing_marks },
    ]),
  );

  const draftSummaries: Array<{
    student_id: number;
    class_id: number;
    section_id: number | null;
    first_name: string;
    last_name: string;
    eval: ReturnType<typeof evaluateStudentResult>;
  }> = [];

  for (const student of studentsRes.rows) {
    const studentMarks = marksByStudent.get(student.id);
    if (!studentMarks || studentMarks.size === 0) continue;

    const subjectInputs = subjectIds.map((sid) => {
      const meta = subjectMeta.get(sid)!;
      const entry = studentMarks.get(sid);
      return {
        subject_id: sid,
        marks_obtained: entry?.absent ? 0 : entry?.marks ?? 0,
        max_marks: meta.max,
        passing_marks: meta.pass,
        is_absent: entry?.absent ?? false,
      };
    });

    const evalResult = evaluateStudentResult(subjectInputs, minOverall, scale);
    draftSummaries.push({
      student_id: student.id,
      class_id: student.class_id,
      section_id: student.section_id,
      first_name: student.first_name,
      last_name: student.last_name,
      eval: evalResult,
    });
  }

  const rankCandidates: RankCandidate[] = draftSummaries.map((s) => ({
    student_id: s.student_id,
    percentage: s.eval.percentage,
    obtained_marks: s.eval.obtained_marks,
    first_name: s.first_name,
    last_name: s.last_name,
    class_id: s.class_id,
    section_id: s.section_id,
  }));

  const ranks = computeRanks(rankCandidates);
  const rankMap = new Map(ranks.map((r) => [r.student_id, r]));

  await db.query('BEGIN');
  try {
    for (const summary of draftSummaries) {
      const rank = rankMap.get(summary.student_id);
      await db.query(
        `INSERT INTO student_exam_summary (
          tenant_id, academic_year_id, exam_id, student_id, class_id, section_id,
          total_subjects, passed_subjects, failed_subjects,
          total_marks, obtained_marks, percentage, overall_grade, result_status,
          class_rank, section_rank, school_rank,
          compiled_at, compiled_by, publish_status, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          $15, $16, $17, NOW(), $18, 'draft', NOW()
        )
        ON CONFLICT (exam_id, student_id) DO UPDATE SET
          academic_year_id = EXCLUDED.academic_year_id,
          class_id = EXCLUDED.class_id,
          section_id = EXCLUDED.section_id,
          total_subjects = EXCLUDED.total_subjects,
          passed_subjects = EXCLUDED.passed_subjects,
          failed_subjects = EXCLUDED.failed_subjects,
          total_marks = EXCLUDED.total_marks,
          obtained_marks = EXCLUDED.obtained_marks,
          percentage = EXCLUDED.percentage,
          overall_grade = EXCLUDED.overall_grade,
          result_status = EXCLUDED.result_status,
          class_rank = EXCLUDED.class_rank,
          section_rank = EXCLUDED.section_rank,
          school_rank = EXCLUDED.school_rank,
          compiled_at = NOW(),
          compiled_by = EXCLUDED.compiled_by,
          publish_status = CASE
            WHEN student_exam_summary.publish_status = 'published' THEN 'published'
            ELSE 'draft'
          END,
          updated_at = NOW()`,
        [
          tenantId ?? null,
          academicYearId,
          examId,
          summary.student_id,
          summary.class_id,
          summary.section_id,
          summary.eval.total_subjects,
          summary.eval.passed_subjects,
          summary.eval.failed_subjects,
          summary.eval.total_marks,
          summary.eval.obtained_marks,
          summary.eval.percentage,
          summary.eval.overall_grade,
          summary.eval.result_status,
          rank?.class_rank ?? null,
          rank?.section_rank ?? null,
          rank?.school_rank ?? null,
          compiledBy,
        ],
      );
    }

    await db.query(
      `UPDATE exams SET last_compiled_at = NOW(), last_compiled_by = $2, updated_at = NOW()
       WHERE id = $1`,
      [examId, compiledBy],
    );

    await logExamResultAudit(db, {
      exam_id: examId,
      action: 'compile_results',
      actor_id: compiledBy,
      tenant_id: tenantId ?? null,
      metadata: { students_compiled: draftSummaries.length },
    });

    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }

  if (['annual', 'final'].includes(exam.exam_type)) {
    await generatePromotionRecommendations(db, examId, tenantId);
  }

  const passCount = draftSummaries.filter((s) => s.eval.result_status === 'PASS').length;
  const failCount = draftSummaries.length - passCount;
  const top = draftSummaries
    .filter((s) => rankMap.get(s.student_id)?.class_rank === 1)
    .sort((a, b) => b.eval.percentage - a.eval.percentage)[0];

  return {
    students_compiled: draftSummaries.length,
    pass_count: passCount,
    fail_count: failCount,
    pass_percentage:
      draftSummaries.length > 0
        ? Math.round((passCount / draftSummaries.length) * 10000) / 100
        : 0,
    top_ranker: top
      ? {
          student_id: top.student_id,
          name: `${top.first_name} ${top.last_name}`.trim(),
          percentage: top.eval.percentage,
          class_rank: rankMap.get(top.student_id)?.class_rank ?? 1,
        }
      : null,
  };
}
