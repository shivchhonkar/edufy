import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireStudentFromQuery } from '@/lib/require-student-api';

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    const result = await db.query(
      `SELECT
        er.*,
        e.name as exam_name,
        e.exam_type,
        e.exam_date,
        COALESCE(es.total_marks, e.total_marks) as total_marks,
        COALESCE(es.passing_marks, e.passing_marks) as passing_marks,
        sub.name as subject_name,
        c.name as class_name,
        ROUND((er.marks_obtained / NULLIF(COALESCE(es.total_marks, e.total_marks), 0)) * 100, 2) as percentage,
        ses.overall_grade,
        ses.percentage as overall_percentage,
        ses.result_status as overall_result_status,
        ses.class_rank,
        ses.section_rank,
        ses.school_rank,
        CASE
          WHEN er.is_absent THEN 'Absent'
          WHEN er.marks_obtained >= COALESCE(es.passing_marks, e.passing_marks) THEN 'Pass'
          ELSE 'Fail'
        END as result_status
      FROM exam_results er
      JOIN exams e ON er.exam_id = e.id
      LEFT JOIN subjects sub ON sub.id = COALESCE(er.subject_id, e.subject_id)
      LEFT JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = COALESCE(er.subject_id, e.subject_id)
      JOIN classes c ON e.class_id = c.id
      LEFT JOIN student_exam_summary ses ON ses.exam_id = e.id AND ses.student_id = er.student_id
      WHERE er.student_id = $1
        AND (
          (ses.id IS NOT NULL AND ses.publish_status = 'published')
          OR (
            ses.id IS NULL
            AND COALESCE(e.result_workflow_status, 'published') = 'published'
          )
        )
      ORDER BY e.exam_date DESC, e.created_at DESC, sub.name`,
      [studentId],
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error('Error fetching student results:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch results';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
