import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { ensureExamsSchema, fetchExamSubjects } from '@/lib/ensure-exams-schema';
import { ensureExamResultEngineSchema } from '@/lib/ensure-exam-result-engine';
import { requireTeacherAuth, resolveStaffId, ensureTeacherSchema } from '@/lib/teacher-auth';

async function teacherCanAccessExam(
  db: Parameters<typeof resolveStaffId>[0],
  staffId: number,
  examId: number,
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1
     FROM exams e
     INNER JOIN teacher_assignments ta ON ta.staff_id = $1 AND ta.class_id = e.class_id
       AND (
         ta.subject_id IS NULL
         OR e.subject_id = ta.subject_id
         OR EXISTS (
           SELECT 1 FROM exam_subjects es
           WHERE es.exam_id = e.id AND es.subject_id = ta.subject_id
         )
       )
     WHERE e.id = $2
     LIMIT 1`,
    [staffId, examId],
  );
  return result.rows.length > 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const examId = parseInt(params.id, 10);
    if (Number.isNaN(examId)) {
      return NextResponse.json({ success: false, error: 'Invalid exam id' }, { status: 400 });
    }

    const allowed = await teacherCanAccessExam(db, staffId, examId);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const result = await db.query(
      `SELECT e.*,
        c.name AS class_name,
        s.name AS subject_name,
        (SELECT COUNT(DISTINCT er.student_id) FROM exam_results er WHERE er.exam_id = e.id) AS total_results,
        (SELECT COUNT(*) FROM students WHERE class_id = e.class_id AND status = 'active') AS total_students
       FROM exams e
       LEFT JOIN classes c ON e.class_id = c.id
       LEFT JOIN subjects s ON e.subject_id = s.id
       WHERE e.id = $1`,
      [examId],
    );

    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
    }

    const subjects = await fetchExamSubjects(db, examId);

    const results = await db.query(
      `SELECT er.*,
        st.first_name, st.last_name, st.admission_number, st.roll_number,
        sub.name AS subject_name,
        ROUND((er.marks_obtained / NULLIF(COALESCE(es.total_marks, e.total_marks), 0)) * 100, 2) AS percentage
       FROM exam_results er
       JOIN students st ON er.student_id = st.id
       JOIN exams e ON er.exam_id = e.id
       LEFT JOIN exam_subjects es ON es.exam_id = e.id AND es.subject_id = er.subject_id
       LEFT JOIN subjects sub ON sub.id = COALESCE(er.subject_id, e.subject_id)
       WHERE er.exam_id = $1
       ORDER BY st.roll_number NULLS LAST, st.first_name, sub.name`,
      [examId],
    );

    return NextResponse.json({
      success: true,
      data: {
        ...result.rows[0],
        subjects,
        subject_names: subjects.map((s) => s.subject_name).join(', '),
        results: results.rows,
      },
    });
  } catch (error) {
    console.error('Teacher exam detail error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch exam';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
