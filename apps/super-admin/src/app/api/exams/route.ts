import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureExamsSchema, fetchExamSubjects } from '@/lib/ensure-exams-schema';
import { ensureExamResultEngineSchema } from '@/lib/ensure-exam-result-engine';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureExamsSchema(db);
    await ensureExamResultEngineSchema(db);
    const searchParams = request.nextUrl.searchParams;
    const classId = searchParams.get('class_id');
    const subjectId = searchParams.get('subject_id');
    const examType = searchParams.get('exam_type');

    let query = `
      SELECT 
        e.*,
        c.name as class_name,
        s.name as subject_name,
        u.full_name as created_by_name,
        (SELECT COUNT(DISTINCT er.student_id) FROM exam_results er WHERE er.exam_id = e.id) as total_results,
        (SELECT COUNT(*) FROM students WHERE class_id = e.class_id AND status = 'active') as total_students,
        COALESCE(
          (SELECT string_agg(sub.name, ', ' ORDER BY sub.name)
           FROM exam_subjects es
           JOIN subjects sub ON es.subject_id = sub.id
           WHERE es.exam_id = e.id),
          s.name
        ) as subject_names,
        (SELECT COUNT(*) FROM exam_subjects WHERE exam_id = e.id) as subject_count,
        COALESCE(e.result_workflow_status, 'published') as result_workflow_status,
        e.last_compiled_at,
        e.published_at as results_published_at,
        COALESCE(e.academic_year, c.academic_year, 'Unassigned Session') AS session_label
      FROM exams e
      LEFT JOIN classes c ON e.class_id = c.id
      LEFT JOIN subjects s ON e.subject_id = s.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE 1=1
    `;

    const params: (string | number)[] = [];
    let paramCount = 0;

    if (classId) {
      paramCount++;
      query += ` AND e.class_id = $${paramCount}`;
      params.push(classId);
    }

    if (subjectId) {
      paramCount++;
      query += ` AND (
        e.subject_id = $${paramCount}
        OR EXISTS (SELECT 1 FROM exam_subjects es WHERE es.exam_id = e.id AND es.subject_id = $${paramCount})
      )`;
      params.push(subjectId);
    }

    if (examType) {
      paramCount++;
      query += ` AND e.exam_type = $${paramCount}`;
      params.push(examType);
    }

    query += ` ORDER BY e.exam_date DESC, e.created_at DESC`;

    const result = await db.query(query, params);
    const exams = await Promise.all(
      result.rows.map(async (row) => ({
        ...row,
        subjects: await fetchExamSubjects(db, row.id as number),
      }))
    );

    return NextResponse.json({ success: true, data: exams });
  } catch (error) {
    console.error('Error fetching exams:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch exams';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureExamsSchema(db);
    await ensureExamResultEngineSchema(db);

    const body = await request.json();
    const {
      name,
      class_id,
      subject_id,
      subject_ids,
      exam_type,
      exam_date,
      total_marks,
      passing_marks,
      subject_marks,
      created_by,
    } = body;

    const ids: number[] = subject_ids?.length
      ? subject_ids.map((id: number | string) => parseInt(String(id), 10))
      : subject_id
        ? [parseInt(String(subject_id), 10)]
        : [];

    if (!name || !class_id || !ids.length || !exam_type || !exam_date || !total_marks || !passing_marks) {
      return NextResponse.json(
        { success: false, error: 'Exam name, class, at least one subject, date, and marks are required' },
        { status: 400 }
      );
    }

    const academicYear = await resolveAcademicYear(db, null);
    const defaultTotal = parseInt(String(total_marks), 10);
    const defaultPass = parseInt(String(passing_marks), 10);

    const marksBySubject = new Map<number, { total_marks: number; passing_marks: number }>();
    if (Array.isArray(subject_marks)) {
      for (const entry of subject_marks) {
        const sid = parseInt(String(entry.subject_id), 10);
        if (!Number.isFinite(sid)) continue;
        marksBySubject.set(sid, {
          total_marks: parseInt(String(entry.total_marks), 10),
          passing_marks: parseInt(String(entry.passing_marks), 10),
        });
      }
    }

    const resolvedSubjects = ids.map((sid) => {
      const custom = marksBySubject.get(sid);
      return {
        subject_id: sid,
        total_marks: custom?.total_marks ?? defaultTotal,
        passing_marks: custom?.passing_marks ?? defaultPass,
      };
    });

    for (const entry of resolvedSubjects) {
      if (!entry.total_marks || !entry.passing_marks) {
        return NextResponse.json(
          { success: false, error: 'Each subject must have total marks and passing marks' },
          { status: 400 }
        );
      }
      if (entry.passing_marks > entry.total_marks) {
        return NextResponse.json(
          { success: false, error: 'Passing marks cannot exceed total marks for any subject' },
          { status: 400 }
        );
      }
    }

    const examTotalMarks = Math.max(...resolvedSubjects.map((s) => s.total_marks));
    const examPassMarks = resolvedSubjects.every(
      (s) => s.passing_marks === resolvedSubjects[0].passing_marks,
    )
      ? resolvedSubjects[0].passing_marks
      : defaultPass;

    await db.query('BEGIN');
    try {
      const result = await db.query(
        `INSERT INTO exams (
          name, class_id, subject_id, exam_type, exam_date,
          total_marks, passing_marks, created_by, academic_year,
          start_date, end_date, result_workflow_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $5, $5, 'draft')
        RETURNING *`,
        [
          name,
          parseInt(String(class_id), 10),
          ids[0],
          exam_type,
          exam_date,
          examTotalMarks,
          examPassMarks,
          created_by || null,
          academicYear,
        ]
      );

      const exam = result.rows[0] as { id: number };

      for (const entry of resolvedSubjects) {
        await db.query(
          `INSERT INTO exam_subjects (exam_id, subject_id, total_marks, passing_marks, max_marks, pass_marks)
           VALUES ($1, $2, $3, $4, $3, $4)
           ON CONFLICT (exam_id, subject_id) DO UPDATE
           SET total_marks = EXCLUDED.total_marks, passing_marks = EXCLUDED.passing_marks,
               max_marks = EXCLUDED.max_marks, pass_marks = EXCLUDED.pass_marks`,
          [exam.id, entry.subject_id, entry.total_marks, entry.passing_marks]
        );
      }

      await db.query('COMMIT');

      const subjects = await fetchExamSubjects(db, exam.id);

      return NextResponse.json({
        success: true,
        data: { ...result.rows[0], subjects, subject_names: subjects.map((s) => s.subject_name).join(', ') },
        message: `Exam created with ${ids.length} subject(s)`,
      });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Error creating exam:', error);
    const message = error instanceof Error ? error.message : 'Failed to create exam';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
