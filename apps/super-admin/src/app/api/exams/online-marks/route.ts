import { NextRequest, NextResponse } from 'next/server';
import { EXAM_STUDENT_SELECT, requireExamOps } from '@/lib/exam-operations-utils';
import { fetchExamSubjects } from '@/lib/ensure-exams-schema';
import { gradeForSubjectMarks } from '@/services/exams/grading-engine';
import { prepareEnrollmentSchema, resolveEnrollmentWriteContext } from '@/lib/enrollment-service';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const status = request.nextUrl.searchParams.get('status') || 'pending';
    const examId = request.nextUrl.searchParams.get('exam_id');
    const params: unknown[] = [status];
    let examFilter = '';
    if (examId) {
      params.push(Number(examId));
      examFilter = `AND o.exam_id = $${params.length}`;
    }

    const result = await auth.db.query(
      `SELECT o.*, ${EXAM_STUDENT_SELECT}, e.name AS exam_name, sub.name AS subject_name
       FROM exam_online_marks o
       JOIN students s ON s.id = o.student_id
       JOIN exams e ON e.id = o.exam_id
       LEFT JOIN subjects sub ON sub.id = o.subject_id
       WHERE o.status = $1 ${examFilter}
       ORDER BY o.submitted_at DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error listing online marks:', error);
    return NextResponse.json({ success: false, error: 'Failed to load online exam marks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();

    if (body.action === 'import') {
      const ids: number[] = Array.isArray(body.ids) ? body.ids.map(Number).filter((id: number) => id > 0) : [];
      if (!ids.length) {
        return NextResponse.json({ success: false, error: 'Select marks to import' }, { status: 400 });
      }
      const pending = await auth.db.query(
        `SELECT * FROM exam_online_marks WHERE id = ANY($1) AND status = 'pending'`,
        [ids]
      );
      await prepareEnrollmentSchema(auth.db);
      let imported = 0;
      for (const row of pending.rows) {
        const subjects = await fetchExamSubjects(auth.db, row.exam_id);
        const totalMarks =
          subjects.find((item) => item.subject_id === row.subject_id)?.total_marks ?? 100;
        const grade = await gradeForSubjectMarks(auth.db, Number(row.marks_obtained || 0), totalMarks);
        const exam = await auth.db.query<{ academic_year: string | null }>(
          `SELECT academic_year FROM exams WHERE id = $1`,
          [row.exam_id]
        );
        const writeCtx = await resolveEnrollmentWriteContext(auth.db, row.student_id, {
          academicYear: exam.rows[0]?.academic_year || undefined,
        });
        await auth.db.query(
          `INSERT INTO exam_results (exam_id, student_id, enrollment_id, subject_id, marks_obtained, grade, remarks, is_absent, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (exam_id, student_id, subject_id)
           DO UPDATE SET marks_obtained = EXCLUDED.marks_obtained, grade = EXCLUDED.grade, is_absent = EXCLUDED.is_absent, remarks = EXCLUDED.remarks, updated_at = CURRENT_TIMESTAMP`,
          [
            row.exam_id,
            row.student_id,
            writeCtx?.enrollmentId ?? null,
            row.subject_id,
            row.marks_obtained,
            grade,
            row.remarks || 'Imported from online exam',
            row.is_absent,
            auth.user.id,
          ]
        );
        await auth.db.query(
          `UPDATE exam_online_marks SET status = 'imported', imported_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [row.id]
        );
        imported += 1;
      }
      return NextResponse.json({ success: true, data: { imported }, message: `Imported ${imported} online mark(s)` });
    }

    const examId = Number(body.exam_id);
    const studentId = Number(body.student_id);
    const subjectId = Number(body.subject_id);
    if (!examId || !studentId || !subjectId) {
      return NextResponse.json({ success: false, error: 'Exam, student, and subject are required' }, { status: 400 });
    }
    const result = await auth.db.query(
      `INSERT INTO exam_online_marks (exam_id, student_id, subject_id, marks_obtained, is_absent, source, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
       RETURNING *`,
      [
        examId,
        studentId,
        subjectId,
        parseFloat(String(body.marks_obtained ?? 0)) || 0,
        Boolean(body.is_absent),
        body.source || 'online',
        body.remarks || null,
      ]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Error saving online marks:', error);
    return NextResponse.json({ success: false, error: 'Failed to save online exam marks' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireExamOps(request);
    if (auth instanceof NextResponse) return auth;
    const id = Number(request.nextUrl.searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    await auth.db.query(`UPDATE exam_online_marks SET status = 'rejected' WHERE id = $1 AND status = 'pending'`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting online marks:', error);
    return NextResponse.json({ success: false, error: 'Failed to reject online marks' }, { status: 500 });
  }
}
