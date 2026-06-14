import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTeacherPedagogySchema } from '@/lib/ensure-teacher-pedagogy-schema';
import { requireHrAdmin, requireHrRead } from '@/lib/hr-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureTeacherPedagogySchema(db);

    const classId = request.nextUrl.searchParams.get('class_id');
    const subjectId = request.nextUrl.searchParams.get('subject_id');
    const academicYear = request.nextUrl.searchParams.get('academic_year');

    const params: unknown[] = [];
    let query = `
      SELECT sc.*, c.name AS class_name, s.name AS subject_name,
        COALESCE(sp.periods_completed, 0) AS periods_completed,
        COALESCE(sp.status, 'not_started') AS progress_status,
        sp.id AS progress_id,
        sp.staff_id AS progress_staff_id,
        st.first_name || ' ' || st.last_name AS teacher_name
      FROM syllabus_chapters sc
      LEFT JOIN classes c ON sc.class_id = c.id
      LEFT JOIN subjects s ON sc.subject_id = s.id
      LEFT JOIN syllabus_progress sp ON sp.chapter_id = sc.id
        AND sp.class_id = sc.class_id
        AND (sp.section_id IS NULL)
      LEFT JOIN staff st ON sp.staff_id = st.id
      WHERE sc.is_active = true`;

    if (classId) {
      params.push(parseInt(classId, 10));
      query += ` AND sc.class_id = $${params.length}`;
    }
    if (subjectId) {
      params.push(parseInt(subjectId, 10));
      query += ` AND sc.subject_id = $${params.length}`;
    }
    if (academicYear) {
      params.push(academicYear);
      query += ` AND (sc.academic_year = $${params.length} OR sc.academic_year IS NULL)`;
    }

    query += ' ORDER BY sc.class_id, sc.subject_id, sc.sort_order, sc.id';
    const result = await db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Syllabus GET:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch syllabus' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureTeacherPedagogySchema(db);

    const { class_id, subject_id, title, sort_order, total_periods, academic_year } = await request.json();
    if (!class_id || !subject_id || !title?.trim()) {
      return NextResponse.json({ success: false, error: 'class_id, subject_id, and title are required' }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO syllabus_chapters (class_id, subject_id, title, sort_order, total_periods, academic_year)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [class_id, subject_id, title.trim(), sort_order ?? 0, total_periods ?? 1, academic_year || null]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create chapter' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    await db.query('UPDATE syllabus_chapters SET is_active = false WHERE id = $1', [parseInt(id, 10)]);
    return NextResponse.json({ success: true, message: 'Chapter removed' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete chapter' }, { status: 500 });
  }
}
