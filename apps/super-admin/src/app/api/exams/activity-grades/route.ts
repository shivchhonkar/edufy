import { NextRequest, NextResponse } from 'next/server';
import { EXAM_STUDENT_SELECT, requireExamOps } from '@/lib/exam-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const examId = request.nextUrl.searchParams.get('exam_id');
    const studentId = request.nextUrl.searchParams.get('student_id');
    const classId = request.nextUrl.searchParams.get('class_id');
    if (!examId) {
      return NextResponse.json({ success: false, error: 'exam_id is required' }, { status: 400 });
    }

    const params: unknown[] = [Number(examId)];
    let studentFilter = '';
    if (studentId) {
      params.push(Number(studentId));
      studentFilter = `AND g.student_id = $${params.length}`;
    }

    const exam = await auth.db.query<{ class_id: number }>(
      `SELECT class_id FROM exams WHERE id = $1`,
      [Number(examId)]
    );
    const resolvedClassId = classId ? Number(classId) : exam.rows[0]?.class_id;

    const activities = await auth.db.query(
      `SELECT a.*
       FROM exam_activity_masters a
       JOIN exam_activity_selections sel ON sel.activity_id = a.id
       WHERE sel.exam_id = $1 AND a.is_active = true
         ${resolvedClassId ? 'AND sel.class_id = $2' : ''}
       ORDER BY a.sort_order, a.name`,
      resolvedClassId ? [Number(examId), resolvedClassId] : [Number(examId)]
    );

    const grades = await auth.db.query(
      `SELECT g.*, ${EXAM_STUDENT_SELECT}, a.name AS activity_name
       FROM exam_activity_grades g
       JOIN exam_activity_masters a ON a.id = g.activity_id
       JOIN students s ON s.id = g.student_id
       WHERE g.exam_id = $1 ${studentFilter}
       ORDER BY s.roll_number, s.first_name, a.sort_order`,
      params
    );

    return NextResponse.json({
      success: true,
      data: { activities: activities.rows, grades: grades.rows, class_id: resolvedClassId },
    });
  } catch (error) {
    console.error('Error listing activity grades:', error);
    return NextResponse.json({ success: false, error: 'Failed to load activity grades' }, { status: 500 });
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
      const activityId = Number(row.activity_id);
      const examId = Number(row.exam_id);
      const studentId = Number(row.student_id);
      const grade = String(row.grade || '').trim();
      if (!activityId || !examId || !studentId || !grade) continue;

      const result = await auth.db.query(
        `INSERT INTO exam_activity_grades (activity_id, exam_id, student_id, class_id, grade, remarks)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (activity_id, exam_id, student_id)
         DO UPDATE SET grade = EXCLUDED.grade, remarks = EXCLUDED.remarks, class_id = EXCLUDED.class_id, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [activityId, examId, studentId, row.class_id ? Number(row.class_id) : null, grade, row.remarks || null]
      );
      saved.push(result.rows[0]);
    }

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving activity grades:', error);
    return NextResponse.json({ success: false, error: 'Failed to save activity grades' }, { status: 500 });
  }
}
