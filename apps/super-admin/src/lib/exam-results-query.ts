export type ExamResultRow = {
  student_id: number;
  subject_id: number;
  subject_name: string;
  marks_obtained: number;
  max_marks: number;
  passing_marks: number;
};

export async function fetchExamResultRows(
  db: { query: <T>(sql: string, params?: unknown[]) => Promise<{ rows: T[] }> },
  examId: number,
): Promise<ExamResultRow[]> {
  const result = await db.query<{
    student_id: number;
    subject_id: number;
    subject_name: string;
    marks_obtained: string;
    max_marks: string | number;
    passing_marks: string | number;
  }>(
    `SELECT
      er.student_id,
      COALESCE(er.subject_id, e.subject_id) AS subject_id,
      sub.name AS subject_name,
      er.marks_obtained,
      COALESCE(es.total_marks, es.max_marks, e.total_marks) AS max_marks,
      COALESCE(es.passing_marks, es.pass_marks, e.passing_marks) AS passing_marks
    FROM exam_results er
    JOIN exams e ON er.exam_id = e.id
    LEFT JOIN exam_subjects es ON es.exam_id = e.id
      AND es.subject_id = COALESCE(er.subject_id, e.subject_id)
    LEFT JOIN subjects sub ON sub.id = COALESCE(er.subject_id, e.subject_id)
    WHERE er.exam_id = $1 AND er.is_absent = false`,
    [examId],
  );

  return result.rows.map((r) => ({
    student_id: r.student_id,
    subject_id: r.subject_id,
    subject_name: r.subject_name,
    marks_obtained: parseFloat(r.marks_obtained || '0'),
    max_marks: parseFloat(String(r.max_marks || '0')),
    passing_marks: parseFloat(String(r.passing_marks || '0')),
  }));
}

export function buildResultMap(rows: ExamResultRow[]) {
  const map = new Map<number, Map<number, ExamResultRow>>();
  for (const row of rows) {
    if (!row.subject_id) continue;
    if (!map.has(row.student_id)) map.set(row.student_id, new Map());
    map.get(row.student_id)!.set(row.subject_id, row);
  }
  return map;
}

export function scaleMarks(obtained: number, max: number, targetMax: number): number {
  if (max <= 0 || targetMax <= 0) return 0;
  return Math.round((obtained / max) * targetMax * 10) / 10;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
