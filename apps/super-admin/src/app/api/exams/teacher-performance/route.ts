import { NextRequest, NextResponse } from 'next/server';
import { requireExamOps } from '@/lib/exam-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const examId = request.nextUrl.searchParams.get('exam_id');
    const classId = request.nextUrl.searchParams.get('class_id');
    const params: unknown[] = [];
    const conditions = ['er.subject_id IS NOT NULL'];
    if (examId) {
      params.push(Number(examId));
      conditions.push(`e.id = $${params.length}`);
    }
    if (classId) {
      params.push(Number(classId));
      conditions.push(`e.class_id = $${params.length}`);
    }

    const simpleSql = `
      SELECT
          COALESCE(u.full_name, 'Unassigned') AS teacher_name,
          u.id AS teacher_id,
          sub.name AS subject_name,
          c.name AS class_name,
          e.name AS exam_name,
          COUNT(DISTINCT er.student_id) AS student_count,
          ROUND(AVG(CASE WHEN er.is_absent THEN NULL ELSE er.marks_obtained END)::numeric, 2) AS average_marks,
          COUNT(*) FILTER (WHERE er.is_absent) AS absent_count,
          COUNT(*) FILTER (WHERE NOT er.is_absent AND er.marks_obtained >= COALESCE(es.passing_marks, es.pass_marks, e.passing_marks, 0)) AS passed_count
       FROM exam_results er
       JOIN exams e ON e.id = er.exam_id
       JOIN subjects sub ON sub.id = er.subject_id
       LEFT JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = er.subject_id
       LEFT JOIN classes c ON c.id = e.class_id
       LEFT JOIN class_subjects cs ON cs.class_id = e.class_id AND cs.subject_id = er.subject_id
       LEFT JOIN users u ON u.id = cs.teacher_id
       WHERE ${conditions.join(' AND ')}
       GROUP BY teacher_name, teacher_id, sub.name, c.name, e.name
       ORDER BY average_marks DESC NULLS LAST, teacher_name`;

    let result;
    try {
      result = await auth.db.query(
        `SELECT
            COALESCE(st.first_name || ' ' || st.last_name, u.full_name, 'Unassigned') AS teacher_name,
            COALESCE(st.id, u.id) AS teacher_id,
            sub.name AS subject_name,
            c.name AS class_name,
            e.name AS exam_name,
            COUNT(DISTINCT er.student_id) AS student_count,
            ROUND(AVG(CASE WHEN er.is_absent THEN NULL ELSE er.marks_obtained END)::numeric, 2) AS average_marks,
            COUNT(*) FILTER (WHERE er.is_absent) AS absent_count,
            COUNT(*) FILTER (WHERE NOT er.is_absent AND er.marks_obtained >= COALESCE(es.passing_marks, es.pass_marks, e.passing_marks, 0)) AS passed_count
         FROM exam_results er
         JOIN exams e ON e.id = er.exam_id
         JOIN subjects sub ON sub.id = er.subject_id
         LEFT JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = er.subject_id
         LEFT JOIN classes c ON c.id = e.class_id
         LEFT JOIN class_subjects cs ON cs.class_id = e.class_id AND cs.subject_id = er.subject_id
         LEFT JOIN users u ON u.id = cs.teacher_id
         LEFT JOIN teacher_assignments ta ON ta.class_id = e.class_id AND ta.subject_id = er.subject_id
         LEFT JOIN staff st ON st.id = ta.staff_id
         WHERE ${conditions.join(' AND ')}
         GROUP BY teacher_name, teacher_id, sub.name, c.name, e.name
         ORDER BY average_marks DESC NULLS LAST, teacher_name`,
        params
      );
    } catch {
      result = await auth.db.query(simpleSql, params);
    }

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error loading teacher-wise performance:', error);
    return NextResponse.json({ success: false, error: 'Failed to load teacher-wise performance' }, { status: 500 });
  }
}
