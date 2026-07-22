import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { ensureExamsSchema, fetchExamSubjects } from '@/lib/ensure-exams-schema';
import { ensureExamResultEngineSchema } from '@/lib/ensure-exam-result-engine';
import { requireTeacherAuth, resolveStaffId, ensureTeacherSchema } from '@/lib/teacher-auth';

const EXAM_LIST_QUERY = `
  SELECT DISTINCT ON (e.id)
    e.*,
    c.name AS class_name,
    s.name AS subject_name,
    (SELECT COUNT(DISTINCT er.student_id) FROM exam_results er WHERE er.exam_id = e.id) AS total_results,
    (SELECT COUNT(*) FROM students WHERE class_id = e.class_id AND status = 'active') AS total_students,
    COALESCE(
      (SELECT string_agg(sub.name, ', ' ORDER BY sub.name)
       FROM exam_subjects es
       JOIN subjects sub ON es.subject_id = sub.id
       WHERE es.exam_id = e.id),
      s.name
    ) AS subject_names,
    (SELECT COUNT(*) FROM exam_subjects WHERE exam_id = e.id) AS subject_count,
    COALESCE(e.result_workflow_status, 'published') AS result_workflow_status
  FROM exams e
  LEFT JOIN classes c ON e.class_id = c.id
  LEFT JOIN subjects s ON e.subject_id = s.id
  INNER JOIN teacher_assignments ta ON ta.staff_id = $1 AND ta.class_id = e.class_id
    AND (
      ta.subject_id IS NULL
      OR e.subject_id = ta.subject_id
      OR EXISTS (
        SELECT 1 FROM exam_subjects es
        WHERE es.exam_id = e.id AND es.subject_id = ta.subject_id
      )
    )
    AND (ta.section_id IS NULL OR EXISTS (
      SELECT 1 FROM students st
      WHERE st.class_id = e.class_id AND st.section_id = ta.section_id AND st.status = 'active'
    ))
  WHERE 1=1
`;

export async function GET(request: NextRequest) {
  try {
    const auth = requireTeacherAuth(request);
    if (auth instanceof NextResponse) return auth;

    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    await ensureTeacherSchema(db);
    await ensureExamsSchema(db);
    await ensureExamResultEngineSchema(db);

    const staffId = await resolveStaffId(db, auth.user.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const classId = request.nextUrl.searchParams.get('class_id');
    const examType = request.nextUrl.searchParams.get('exam_type');

    const params: (string | number)[] = [staffId];
    let query = EXAM_LIST_QUERY;

    if (classId) {
      params.push(parseInt(classId, 10));
      query += ` AND e.class_id = $${params.length}`;
    }
    if (examType) {
      params.push(examType);
      query += ` AND e.exam_type = $${params.length}`;
    }

    query += ' ORDER BY e.id, e.exam_date DESC, e.created_at DESC';

    const result = await db.query(query, params);
    const exams = await Promise.all(
      result.rows.map(async (row) => ({
        ...row,
        subjects: await fetchExamSubjects(db, row.id as number),
      })),
    );

    return NextResponse.json({ success: true, data: exams });
  } catch (error) {
    console.error('Teacher exams GET:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch exams';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
