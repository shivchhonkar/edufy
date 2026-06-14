import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTeacherPedagogySchema } from '@/lib/ensure-teacher-pedagogy-schema';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTeacherPedagogySchema(db);

    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const body = await request.json();
    const {
      title,
      class_id,
      section_id,
      subject_id,
      staff_id,
      lesson_date,
      duration_minutes,
      topic,
      objectives,
      materials,
      procedure,
      assessment,
      homework,
      status,
      academic_year,
      week_number,
      period_number,
    } = body;

    if (!title?.trim() || !class_id || !subject_id || !lesson_date) {
      return NextResponse.json(
        { success: false, error: 'title, class_id, subject_id, and lesson_date are required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `UPDATE lesson_plans SET
        title = $1, class_id = $2, section_id = $3, subject_id = $4, staff_id = $5,
        lesson_date = $6, duration_minutes = $7, topic = $8, objectives = $9,
        materials = $10, procedure = $11, assessment = $12, homework = $13,
        status = $14, academic_year = $15, week_number = $16, period_number = $17,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $18
       RETURNING *`,
      [
        title.trim(),
        class_id,
        section_id || null,
        subject_id,
        staff_id || null,
        lesson_date,
        duration_minutes ?? 40,
        topic?.trim() || null,
        objectives?.trim() || null,
        materials?.trim() || null,
        procedure?.trim() || null,
        assessment?.trim() || null,
        homework?.trim() || null,
        status || 'scheduled',
        academic_year || null,
        week_number ?? null,
        period_number ?? null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Lesson plan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Lesson plans PUT:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update lesson plan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTeacherPedagogySchema(db);

    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const result = await db.query('DELETE FROM lesson_plans WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Lesson plan not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Lesson plan deleted' });
  } catch (error) {
    console.error('Lesson plans DELETE:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete lesson plan' },
      { status: 500 }
    );
  }
}
