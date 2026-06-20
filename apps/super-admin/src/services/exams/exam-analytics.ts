import type { RequestDb } from '@/lib/request-db';

export type ExamAnalytics = {
  exam_id: number;
  exam_name: string;
  students_compiled: number;
  pass_count: number;
  fail_count: number;
  pass_percentage: number;
  fail_percentage: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  class_performance: { class_id: number; class_name: string; avg_percentage: number; pass_rate: number }[];
  subject_performance: {
    subject_id: number;
    subject_name: string;
    avg_percentage: number;
    pass_rate: number;
    avg_marks: number;
  }[];
  top_class_performers: { student_id: number; name: string; percentage: number; class_rank: number }[];
  top_school_performers: { student_id: number; name: string; percentage: number; school_rank: number }[];
  subject_toppers: { subject_name: string; student_name: string; marks_obtained: number }[];
  weakest_subject: { subject_name: string; avg_percentage: number } | null;
  best_class: { class_name: string; avg_percentage: number } | null;
  students_at_risk: { student_id: number; name: string; percentage: number; failed_subjects: number }[];
};

export async function buildExamAnalytics(db: RequestDb, examId: number): Promise<ExamAnalytics | null> {
  const examRes = await db.query<{ id: number; name: string }>(
    `SELECT id, name FROM exams WHERE id = $1`,
    [examId],
  );
  const exam = examRes.rows[0];
  if (!exam) return null;

  const summaryRes = await db.query<{
    student_id: number;
    percentage: string;
    result_status: string;
    failed_subjects: number;
    class_rank: number | null;
    school_rank: number | null;
    first_name: string;
    last_name: string;
    class_id: number;
    class_name: string;
  }>(
    `SELECT ses.*, s.first_name, s.last_name, c.name AS class_name
     FROM student_exam_summary ses
     JOIN students s ON s.id = ses.student_id
     JOIN classes c ON c.id = ses.class_id
     WHERE ses.exam_id = $1`,
    [examId],
  );

  const rows = summaryRes.rows;
  const n = rows.length;
  const passCount = rows.filter((r) => r.result_status === 'PASS').length;
  const failCount = n - passCount;
  const percentages = rows.map((r) => parseFloat(String(r.percentage)));

  const avg = n > 0 ? percentages.reduce((a, b) => a + b, 0) / n : 0;
  const highest = n > 0 ? Math.max(...percentages) : 0;
  const lowest = n > 0 ? Math.min(...percentages) : 0;

  const classMap = new Map<number, { name: string; pcts: number[]; pass: number }>();
  for (const r of rows) {
    if (!classMap.has(r.class_id)) classMap.set(r.class_id, { name: r.class_name, pcts: [], pass: 0 });
    const entry = classMap.get(r.class_id)!;
    entry.pcts.push(parseFloat(String(r.percentage)));
    if (r.result_status === 'PASS') entry.pass += 1;
  }

  const classPerformance = [...classMap.entries()].map(([class_id, v]) => ({
    class_id,
    class_name: v.name,
    avg_percentage: Math.round((v.pcts.reduce((a, b) => a + b, 0) / v.pcts.length) * 100) / 100,
    pass_rate: Math.round((v.pass / v.pcts.length) * 10000) / 100,
  }));

  const subjectRes = await db.query<{
    subject_id: number;
    subject_name: string;
    marks_obtained: string;
    max_marks: string;
    passing_marks: string;
    is_absent: boolean;
  }>(
    `SELECT COALESCE(er.subject_id, e.subject_id) AS subject_id,
            sub.name AS subject_name,
            er.marks_obtained,
            COALESCE(es.total_marks, e.total_marks)::text AS max_marks,
            COALESCE(es.passing_marks, e.passing_marks)::text AS passing_marks,
            er.is_absent
     FROM exam_results er
     JOIN exams e ON e.id = er.exam_id
     LEFT JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = COALESCE(er.subject_id, e.subject_id)
     LEFT JOIN subjects sub ON sub.id = COALESCE(er.subject_id, e.subject_id)
     WHERE er.exam_id = $1`,
    [examId],
  );

  const subjectAgg = new Map<
    number,
    { name: string; pcts: number[]; pass: number; marks: number[] }
  >();
  for (const r of subjectRes.rows) {
    if (!r.subject_id) continue;
    if (!subjectAgg.has(r.subject_id)) {
      subjectAgg.set(r.subject_id, { name: r.subject_name, pcts: [], pass: 0, marks: [] });
    }
    const entry = subjectAgg.get(r.subject_id)!;
    const max = parseFloat(r.max_marks || '0');
    const obtained = r.is_absent ? 0 : parseFloat(r.marks_obtained || '0');
    const passMark = parseFloat(r.passing_marks || '0');
    if (max > 0) entry.pcts.push((obtained / max) * 100);
    if (!r.is_absent && obtained >= passMark) entry.pass += 1;
    entry.marks.push(obtained);
  }

  const subjectPerformance = [...subjectAgg.entries()].map(([subject_id, v]) => ({
    subject_id,
    subject_name: v.name,
    avg_percentage:
      v.pcts.length > 0
        ? Math.round((v.pcts.reduce((a, b) => a + b, 0) / v.pcts.length) * 100) / 100
        : 0,
    pass_rate:
      v.marks.length > 0 ? Math.round((v.pass / v.marks.length) * 10000) / 100 : 0,
    avg_marks:
      v.marks.length > 0
        ? Math.round((v.marks.reduce((a, b) => a + b, 0) / v.marks.length) * 100) / 100
        : 0,
  }));

  const weakest =
    subjectPerformance.length > 0
      ? subjectPerformance.reduce((min, s) => (s.avg_percentage < min.avg_percentage ? s : min))
      : null;

  const bestClass =
    classPerformance.length > 0
      ? classPerformance.reduce((max, c) => (c.avg_percentage > max.avg_percentage ? c : max))
      : null;

  const topClass = [...rows]
    .filter((r) => r.class_rank != null)
    .sort((a, b) => Number(a.class_rank) - Number(b.class_rank))
    .slice(0, 10)
    .map((r) => ({
      student_id: r.student_id,
      name: `${r.first_name} ${r.last_name}`.trim(),
      percentage: parseFloat(String(r.percentage)),
      class_rank: r.class_rank!,
    }));

  const topSchool = [...rows]
    .filter((r) => r.school_rank != null)
    .sort((a, b) => Number(a.school_rank) - Number(b.school_rank))
    .slice(0, 10)
    .map((r) => ({
      student_id: r.student_id,
      name: `${r.first_name} ${r.last_name}`.trim(),
      percentage: parseFloat(String(r.percentage)),
      school_rank: r.school_rank!,
    }));

  const subjectTopperRes = await db.query<{
    subject_name: string;
    first_name: string;
    last_name: string;
    marks_obtained: string;
  }>(
    `SELECT DISTINCT ON (sub.id)
            sub.name AS subject_name, s.first_name, s.last_name, er.marks_obtained
     FROM exam_results er
     JOIN students s ON s.id = er.student_id
     JOIN exams e ON e.id = er.exam_id
     LEFT JOIN subjects sub ON sub.id = COALESCE(er.subject_id, e.subject_id)
     WHERE er.exam_id = $1 AND er.is_absent = false
     ORDER BY sub.id, er.marks_obtained DESC`,
    [examId],
  );

  const atRisk = rows
    .filter((r) => r.result_status === 'FAIL' || r.failed_subjects > 0)
    .sort((a, b) => parseFloat(String(a.percentage)) - parseFloat(String(b.percentage)))
    .slice(0, 25)
    .map((r) => ({
      student_id: r.student_id,
      name: `${r.first_name} ${r.last_name}`.trim(),
      percentage: parseFloat(String(r.percentage)),
      failed_subjects: r.failed_subjects,
    }));

  return {
    exam_id: exam.id,
    exam_name: exam.name,
    students_compiled: n,
    pass_count: passCount,
    fail_count: failCount,
    pass_percentage: n > 0 ? Math.round((passCount / n) * 10000) / 100 : 0,
    fail_percentage: n > 0 ? Math.round((failCount / n) * 10000) / 100 : 0,
    average_score: Math.round(avg * 100) / 100,
    highest_score: highest,
    lowest_score: lowest,
    class_performance: classPerformance,
    subject_performance: subjectPerformance,
    top_class_performers: topClass,
    top_school_performers: topSchool,
    subject_toppers: subjectTopperRes.rows.map((r) => ({
      subject_name: r.subject_name,
      student_name: `${r.first_name} ${r.last_name}`.trim(),
      marks_obtained: parseFloat(r.marks_obtained),
    })),
    weakest_subject: weakest
      ? { subject_name: weakest.subject_name, avg_percentage: weakest.avg_percentage }
      : null,
    best_class: bestClass
      ? { class_name: bestClass.class_name, avg_percentage: bestClass.avg_percentage }
      : null,
    students_at_risk: atRisk,
  };
}

export async function buildExamComparison(db: RequestDb, examIds: number[]) {
  const results = [];
  for (const id of examIds) {
    const analytics = await buildExamAnalytics(db, id);
    if (analytics) results.push(analytics);
  }
  return results;
}
