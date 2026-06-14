import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureExamsSchema, fetchExamSubjects } from '@/lib/ensure-exams-schema';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureExamsSchema(db);

    const result = await db.query(
      `SELECT 
        e.*,
        c.name as class_name,
        s.name as subject_name,
        u.full_name as created_by_name
      FROM exams e
      LEFT JOIN classes c ON e.class_id = c.id
      LEFT JOIN subjects s ON e.subject_id = s.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1`,
      [params.id]
    );

    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
    }

    const subjects = await fetchExamSubjects(db, parseInt(params.id, 10));

    return NextResponse.json({
      success: true,
      data: {
        ...result.rows[0],
        subjects,
        subject_names: subjects.map((s) => s.subject_name).join(', '),
      },
    });
  } catch (error) {
    console.error('Error fetching exam:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch exam';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureExamsSchema(db);
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
    } = body;

    const ids: number[] = subject_ids?.length
      ? subject_ids.map((id: number | string) => parseInt(String(id), 10))
      : subject_id
        ? [parseInt(String(subject_id), 10)]
        : [];

    if (!ids.length) {
      return NextResponse.json({ success: false, error: 'At least one subject is required' }, { status: 400 });
    }

    const marks = parseInt(String(total_marks), 10);
    const passMarks = parseInt(String(passing_marks), 10);

    await db.query('BEGIN');
    try {
      const result = await db.query(
        `UPDATE exams 
         SET name = $1, class_id = $2, subject_id = $3, exam_type = $4,
             exam_date = $5, total_marks = $6, passing_marks = $7,
             start_date = $5, end_date = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8
         RETURNING *`,
        [name, parseInt(String(class_id), 10), ids[0], exam_type, exam_date, marks, passMarks, params.id]
      );

      if (!result.rows.length) {
        await db.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
      }

      const hasResults = await db.query(
        'SELECT 1 FROM exam_results WHERE exam_id = $1 LIMIT 1',
        [params.id]
      );

      if (!hasResults.rows.length) {
        await db.query('DELETE FROM exam_subjects WHERE exam_id = $1', [params.id]);
        for (const sid of ids) {
          await db.query(
            `INSERT INTO exam_subjects (exam_id, subject_id, total_marks, passing_marks, max_marks, pass_marks)
             VALUES ($1, $2, $3, $4, $3, $4)`,
            [params.id, sid, marks, passMarks]
          );
        }
      } else {
        for (const sid of ids) {
          await db.query(
            `INSERT INTO exam_subjects (exam_id, subject_id, total_marks, passing_marks, max_marks, pass_marks)
             VALUES ($1, $2, $3, $4, $3, $4)
             ON CONFLICT (exam_id, subject_id) DO UPDATE
             SET total_marks = EXCLUDED.total_marks, passing_marks = EXCLUDED.passing_marks,
                 max_marks = EXCLUDED.max_marks, pass_marks = EXCLUDED.pass_marks`,
            [params.id, sid, marks, passMarks]
          );
        }
      }

      await db.query('COMMIT');

      const subjects = await fetchExamSubjects(db, parseInt(params.id, 10));

      return NextResponse.json({
        success: true,
        data: { ...result.rows[0], subjects },
        message: 'Exam updated successfully',
      });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Error updating exam:', error);
    const message = error instanceof Error ? error.message : 'Failed to update exam';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureExamsSchema(db);

    const result = await db.query('DELETE FROM exams WHERE id = $1 RETURNING *', [params.id]);

    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Exam not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Exam deleted successfully' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete exam';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
