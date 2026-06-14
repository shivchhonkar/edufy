import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureExamsSchema, fetchExamSubjects } from '@/lib/ensure-exams-schema';

function calculateGrade(marksObtained: number, totalMarks: number): string {
  if (totalMarks === 0) return 'F';
  const percentage = (marksObtained / totalMarks) * 100;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureExamsSchema(db);

    const result = await db.query(
      `SELECT 
        er.*,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.roll_number,
        u.full_name as uploaded_by_name,
        COALESCE(es.total_marks, es.max_marks, e.total_marks) as total_marks,
        COALESCE(es.passing_marks, es.pass_marks, e.passing_marks) as passing_marks,
        sub.name as subject_name,
        ROUND((er.marks_obtained / NULLIF(COALESCE(es.total_marks, e.total_marks), 0)) * 100, 2) as percentage
      FROM exam_results er
      JOIN students s ON er.student_id = s.id
      JOIN exams e ON er.exam_id = e.id
      LEFT JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = er.subject_id
      LEFT JOIN subjects sub ON sub.id = COALESCE(er.subject_id, e.subject_id)
      LEFT JOIN users u ON er.uploaded_by = u.id
      WHERE er.exam_id = $1
      ORDER BY s.roll_number, s.first_name, sub.name`,
      [params.id]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching exam results:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch results';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureExamsSchema(db);
    const body = await request.json();
    const { results, uploaded_by } = body;

    if (!results || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json({ success: false, error: 'Results array is required' }, { status: 400 });
    }

    const examSubjects = await fetchExamSubjects(db, parseInt(params.id, 10));
    const defaultSubjectId = examSubjects[0]?.subject_id ?? null;
    const marksBySubject = new Map(
      examSubjects.map((s) => [s.subject_id, s.total_marks])
    );

    const examResult = await db.query<{ total_marks: number }>(
      'SELECT total_marks FROM exams WHERE id = $1',
      [params.id]
    );

    if (!examResult.rows.length) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
    }

    const defaultTotalMarks = examResult.rows[0].total_marks;
    const insertedResults = [];

    for (const result of results) {
      const { student_id, marks_obtained, is_absent, remarks, subject_id } = result;
      const sid = subject_id != null ? parseInt(String(subject_id), 10) : defaultSubjectId;
      const totalMarks = sid != null ? (marksBySubject.get(sid) ?? defaultTotalMarks) : defaultTotalMarks;
      const grade = calculateGrade(marks_obtained || 0, totalMarks);

      const insertResult = await db.query(
        `INSERT INTO exam_results (
          exam_id, student_id, subject_id, marks_obtained, grade, remarks, is_absent, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (exam_id, student_id, subject_id)
        DO UPDATE SET 
          marks_obtained = EXCLUDED.marks_obtained,
          grade = EXCLUDED.grade,
          remarks = EXCLUDED.remarks,
          is_absent = EXCLUDED.is_absent,
          uploaded_by = EXCLUDED.uploaded_by,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [params.id, student_id, sid, marks_obtained || 0, grade, remarks, is_absent || false, uploaded_by]
      );

      insertedResults.push(insertResult.rows[0]);
    }

    return NextResponse.json({
      success: true,
      data: insertedResults,
      message: `${insertedResults.length} result(s) uploaded successfully`,
    });
  } catch (error) {
    console.error('Error uploading exam results:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload results';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
