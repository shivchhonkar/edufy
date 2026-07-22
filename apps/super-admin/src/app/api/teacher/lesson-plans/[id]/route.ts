import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError, type RequestDb } from '@/lib/request-db';
import { ensureTeacherPedagogySchema } from '@/lib/ensure-teacher-pedagogy-schema';
import {
  requireTeacherAuth,
  resolveStaffId,
  teacherHasClassAccess,
  ensureTeacherSchema,
} from '@/lib/teacher-auth';

async function loadLessonPlan(db: RequestDb, id: number) {
  const result = await db.query(
    `SELECT lp.*,
      c.name AS class_name,
      sec.name AS section_name,
      sub.name AS subject_name
     FROM lesson_plans lp
     LEFT JOIN classes c ON lp.class_id = c.id
     LEFT JOIN sections sec ON lp.section_id = sec.id
     LEFT JOIN subjects sub ON lp.subject_id = sub.id
     WHERE lp.id = $1`,
    [id],
  );
  return result.rows[0] as
    | {
        id: number;
        staff_id: number | null;
        class_id: number;
        section_id: number | null;
      }
    | undefined;
}

async function canManageLessonPlan(
  db: Parameters<typeof teacherHasClassAccess>[0],
  staffId: number,
  plan: { staff_id: number | null; class_id: number; section_id: number | null },
): Promise<boolean> {
  if (plan.staff_id === staffId) return true;
  return teacherHasClassAccess(db, staffId, plan.class_id, plan.section_id);
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
    await ensureTeacherPedagogySchema(db);

    const staffId = await resolveStaffId(db, auth.user.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const plan = await loadLessonPlan(db, id);
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Lesson plan not found' }, { status: 404 });
    }

    const allowed = await canManageLessonPlan(db, staffId, plan);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error('Teacher lesson plan GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lesson plan' },
      { status: 500 },
    );
  }
}

export async function PUT(
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
    await ensureTeacherPedagogySchema(db);

    const staffId = await resolveStaffId(db, auth.user.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const existing = await loadLessonPlan(db, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Lesson plan not found' }, { status: 404 });
    }

    const allowed = await canManageLessonPlan(db, staffId, existing);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      class_id,
      section_id,
      subject_id,
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
        { status: 400 },
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
        staffId,
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
      ],
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Teacher lesson plan PUT:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update lesson plan' },
      { status: 500 },
    );
  }
}

export async function DELETE(
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
    await ensureTeacherPedagogySchema(db);

    const staffId = await resolveStaffId(db, auth.user.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const existing = await loadLessonPlan(db, id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Lesson plan not found' }, { status: 404 });
    }

    const allowed = await canManageLessonPlan(db, staffId, existing);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    await db.query('DELETE FROM lesson_plans WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Lesson plan deleted' });
  } catch (error) {
    console.error('Teacher lesson plan DELETE:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete lesson plan' },
      { status: 500 },
    );
  }
}
