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
    const staffId = request.nextUrl.searchParams.get('staff_id');

    const params: unknown[] = [];
    let query = `
      SELECT sp.*, sc.title AS chapter_title, sc.total_periods AS chapter_total_periods,
        c.name AS class_name, sub.name AS subject_name,
        s.first_name || ' ' || s.last_name AS teacher_name
      FROM syllabus_progress sp
      INNER JOIN syllabus_chapters sc ON sp.chapter_id = sc.id
      LEFT JOIN classes c ON sp.class_id = c.id
      LEFT JOIN subjects sub ON sc.subject_id = sub.id
      LEFT JOIN staff s ON sp.staff_id = s.id
      WHERE sc.is_active = true`;

    if (classId) {
      params.push(parseInt(classId, 10));
      query += ` AND sp.class_id = $${params.length}`;
    }
    if (staffId) {
      params.push(parseInt(staffId, 10));
      query += ` AND sp.staff_id = $${params.length}`;
    }

    query += ' ORDER BY sc.sort_order, sc.id';
    const result = await db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch progress' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureTeacherPedagogySchema(db);

    const {
      chapter_id, staff_id, class_id, section_id, academic_year,
      periods_completed, status, notes,
    } = await request.json();

    if (!chapter_id || !class_id) {
      return NextResponse.json({ success: false, error: 'chapter_id and class_id are required' }, { status: 400 });
    }

    const chapter = await db.query(
      'SELECT total_periods FROM syllabus_chapters WHERE id = $1',
      [chapter_id]
    );
    const totalPeriods = chapter.rows[0]?.total_periods ?? 1;
    const completed = periods_completed ?? 0;
    let progressStatus = status;
    if (!progressStatus) {
      if (completed <= 0) progressStatus = 'not_started';
      else if (completed >= totalPeriods) progressStatus = 'completed';
      else progressStatus = 'in_progress';
    }

    const existing = await db.query(
      `SELECT id FROM syllabus_progress
       WHERE chapter_id = $1 AND class_id = $2
         AND section_id IS NOT DISTINCT FROM $3
         AND academic_year IS NOT DISTINCT FROM $4`,
      [chapter_id, class_id, section_id || null, academic_year || null]
    );

    let result;
    if (existing.rows.length) {
      result = await db.query(
        `UPDATE syllabus_progress SET
          staff_id = COALESCE($1, staff_id),
          periods_completed = $2,
          status = $3,
          notes = COALESCE($4, notes),
          completed_at = CASE WHEN $3 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 RETURNING *`,
        [staff_id || null, completed, progressStatus, notes?.trim() || null, existing.rows[0].id]
      );
    } else {
      result = await db.query(
        `INSERT INTO syllabus_progress
          (chapter_id, staff_id, class_id, section_id, academic_year, periods_completed, status, notes, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8, CASE WHEN $7 = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END)
         RETURNING *`,
        [chapter_id, staff_id || null, class_id, section_id || null, academic_year || null, completed, progressStatus, notes?.trim() || null]
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Syllabus progress POST:', error);
    return NextResponse.json({ success: false, error: 'Failed to save progress' }, { status: 500 });
  }
}
