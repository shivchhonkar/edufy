import { NextRequest, NextResponse } from 'next/server';
import { requireExamOps } from '@/lib/exam-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const examId = request.nextUrl.searchParams.get('exam_id');
    const classId = request.nextUrl.searchParams.get('class_id');
    const params: unknown[] = [];
    const conditions: string[] = [];
    if (examId) {
      params.push(Number(examId));
      conditions.push(`e.id = $${params.length}`);
    }
    if (classId) {
      params.push(Number(classId));
      conditions.push(`e.class_id = $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await auth.db.query(
      `SELECT e.id AS exam_id, e.name AS exam_name, e.exam_type, e.exam_date AS exam_header_date,
              e.class_id, c.name AS class_name,
              COALESCE(es.subject_id, e.subject_id) AS subject_id, sub.name AS subject_name,
              COALESCE(sch.exam_date, e.exam_date) AS exam_date,
              sch.start_time, sch.end_time, sch.syllabus,
              COALESCE(sch.max_marks, es.total_marks, e.total_marks) AS max_marks,
              sch.id AS schedule_id
       FROM exams e
       LEFT JOIN classes c ON c.id = e.class_id
       LEFT JOIN exam_subjects es ON es.exam_id = e.id
       LEFT JOIN subjects sub ON sub.id = COALESCE(es.subject_id, e.subject_id)
       LEFT JOIN exam_schedule sch ON sch.exam_id = e.id AND sch.subject_id = COALESCE(es.subject_id, e.subject_id)
       ${where}
       ORDER BY e.exam_date DESC NULLS LAST, c.name, sub.name`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows.filter((row) => row.subject_id) });
  } catch (error) {
    console.error('Error listing exam schedule:', error);
    return NextResponse.json({ success: false, error: 'Failed to load exam dates and syllabus' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const rows = Array.isArray(body.rows) ? body.rows : [body];

    const saved = [];
    for (const row of rows) {
      const examId = Number(row.exam_id);
      const subjectId = Number(row.subject_id);
      if (!examId || !subjectId) continue;
      const result = await auth.db.query(
        `INSERT INTO exam_schedule (exam_id, subject_id, exam_date, start_time, end_time, syllabus, max_marks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (exam_id, subject_id)
         DO UPDATE SET
           exam_date = EXCLUDED.exam_date,
           start_time = EXCLUDED.start_time,
           end_time = EXCLUDED.end_time,
           syllabus = EXCLUDED.syllabus,
           max_marks = EXCLUDED.max_marks,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          examId,
          subjectId,
          row.exam_date || null,
          row.start_time || null,
          row.end_time || null,
          row.syllabus || null,
          row.max_marks != null ? Number(row.max_marks) : null,
        ]
      );
      saved.push(result.rows[0]);
    }

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving exam schedule:', error);
    return NextResponse.json({ success: false, error: 'Failed to save exam dates and syllabus' }, { status: 500 });
  }
}
