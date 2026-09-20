import { NextRequest, NextResponse } from 'next/server';
import { JOIN_CURRENT_ENROLLMENT_ON_STUDENT } from '@/lib/enrollment-sql';
import { requireExamOps } from '@/lib/exam-operations-utils';
import { fetchExamSubjects } from '@/lib/ensure-exams-schema';
import { gradeForSubjectMarks } from '@/services/exams/grading-engine';
import { prepareEnrollmentSchema, resolveEnrollmentWriteContext } from '@/lib/enrollment-service';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const examId = Number(request.nextUrl.searchParams.get('exam_id'));
    const subjectId = Number(request.nextUrl.searchParams.get('subject_id'));
    if (!examId || !subjectId) {
      return NextResponse.json({ success: false, error: 'exam_id and subject_id are required' }, { status: 400 });
    }

    const exam = await auth.db.query<{ class_id: number; academic_year: string | null; total_marks: number }>(
      `SELECT class_id, academic_year, total_marks FROM exams WHERE id = $1`,
      [examId]
    );
    if (!exam.rows[0]) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
    }

    const subjects = await fetchExamSubjects(auth.db, examId);
    const subject = subjects.find((row) => row.subject_id === subjectId);
    const students = await auth.db.query(
      `SELECT s.id, s.first_name, s.last_name, s.admission_number,
              COALESCE(ce.roll_number, s.roll_number) AS roll_number,
              er.marks_obtained, er.is_absent, er.remarks, er.grade
       FROM students s
       ${JOIN_CURRENT_ENROLLMENT_ON_STUDENT}
       LEFT JOIN exam_results er
         ON er.student_id = s.id AND er.exam_id = $1 AND er.subject_id = $2
       WHERE COALESCE(ce.class_id, s.class_id) = $3
         AND COALESCE(s.status, 'active') = 'active'
       ORDER BY COALESCE(ce.roll_number, s.roll_number), s.first_name`,
      [examId, subjectId, exam.rows[0].class_id]
    );

    return NextResponse.json({
      success: true,
      data: {
        subject,
        total_marks: subject?.total_marks ?? exam.rows[0].total_marks,
        passing_marks: subject?.passing_marks ?? 0,
        students: students.rows,
      },
    });
  } catch (error) {
    console.error('Error loading subject-wise marks:', error);
    return NextResponse.json({ success: false, error: 'Failed to load subject-wise marks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const examId = Number(body.exam_id);
    const subjectId = Number(body.subject_id);
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!examId || !subjectId || !rows.length) {
      return NextResponse.json({ success: false, error: 'exam_id, subject_id, and rows are required' }, { status: 400 });
    }

    const exam = await auth.db.query<{ academic_year: string | null; total_marks: number }>(
      `SELECT academic_year, total_marks FROM exams WHERE id = $1`,
      [examId]
    );
    const subjects = await fetchExamSubjects(auth.db, examId);
    const totalMarks = subjects.find((row) => row.subject_id === subjectId)?.total_marks ?? exam.rows[0]?.total_marks ?? 100;
    await prepareEnrollmentSchema(auth.db);

    const saved = [];
    for (const row of rows) {
      const studentId = Number(row.student_id);
      if (!studentId) continue;
      const marks = parseFloat(String(row.marks_obtained ?? 0)) || 0;
      const absent = Boolean(row.is_absent);
      const grade = await gradeForSubjectMarks(auth.db, absent ? 0 : marks, totalMarks);
      const writeCtx = await resolveEnrollmentWriteContext(auth.db, studentId, {
        academicYear: exam.rows[0]?.academic_year || undefined,
      });
      const result = await auth.db.query(
        `INSERT INTO exam_results (exam_id, student_id, enrollment_id, subject_id, marks_obtained, grade, remarks, is_absent, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (exam_id, student_id, subject_id)
         DO UPDATE SET
           marks_obtained = EXCLUDED.marks_obtained,
           grade = EXCLUDED.grade,
           remarks = EXCLUDED.remarks,
           is_absent = EXCLUDED.is_absent,
           uploaded_by = EXCLUDED.uploaded_by,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [
          examId,
          studentId,
          writeCtx?.enrollmentId ?? null,
          subjectId,
          absent ? 0 : marks,
          grade,
          row.remarks || null,
          absent,
          auth.user.id,
        ]
      );
      saved.push(result.rows[0]);
    }

    return NextResponse.json({ success: true, data: saved, message: `${saved.length} mark(s) saved` });
  } catch (error) {
    console.error('Error saving subject-wise marks:', error);
    return NextResponse.json({ success: false, error: 'Failed to save subject-wise marks' }, { status: 500 });
  }
}
