import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { ensureTeacherPedagogySchema } from '@/lib/ensure-teacher-pedagogy-schema';
import { classNameOrderSql } from '@/lib/class-sort';
import {
  requireTeacherAuth,
  resolveStaffId,
  ensureTeacherSchema,
} from '@/lib/teacher-auth';

const LIST_QUERY = `
  SELECT lp.*,
    c.name AS class_name,
    sec.name AS section_name,
    sub.name AS subject_name,
    COALESCE(st.first_name || ' ' || st.last_name, '—') AS teacher_name
  FROM lesson_plans lp
  LEFT JOIN classes c ON lp.class_id = c.id
  LEFT JOIN sections sec ON lp.section_id = sec.id
  LEFT JOIN subjects sub ON lp.subject_id = sub.id
  LEFT JOIN staff st ON lp.staff_id = st.id
  WHERE (
    lp.staff_id = $1
    OR EXISTS (
      SELECT 1 FROM teacher_assignments ta
      WHERE ta.staff_id = $1
        AND ta.class_id = lp.class_id
        AND (ta.section_id IS NULL OR ta.section_id = lp.section_id)
        AND (ta.subject_id IS NULL OR ta.subject_id = lp.subject_id)
    )
  )
`;

export async function GET(request: NextRequest) {
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

    const params = request.nextUrl.searchParams;
    const classId = params.get('class_id');
    const status = params.get('status');
    const search = params.get('search');

    const queryParams: unknown[] = [staffId];
    let query = LIST_QUERY;

    if (classId) {
      queryParams.push(parseInt(classId, 10));
      query += ` AND lp.class_id = $${queryParams.length}`;
    }
    if (status) {
      queryParams.push(status);
      query += ` AND lp.status = $${queryParams.length}`;
    }
    if (search?.trim()) {
      queryParams.push(`%${search.trim()}%`);
      query += ` AND (
        lp.title ILIKE $${queryParams.length}
        OR lp.topic ILIKE $${queryParams.length}
      )`;
    }

    query += ` ORDER BY lp.lesson_date DESC, ${classNameOrderSql('c.name')}, sub.name, lp.id DESC`;

    const result = await db.query(query, queryParams);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Teacher lesson plans GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lesson plans' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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
      `INSERT INTO lesson_plans (
        title, class_id, section_id, subject_id, staff_id, lesson_date,
        duration_minutes, topic, objectives, materials, procedure,
        assessment, homework, status, academic_year, week_number, period_number, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
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
        auth.user.id,
      ],
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Teacher lesson plans POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lesson plan' },
      { status: 500 },
    );
  }
}
