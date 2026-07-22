import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { ensureTeacherPedagogySchema } from '@/lib/ensure-teacher-pedagogy-schema';
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api';

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const authResult = requireStudentFromQuery(request);
    if (authResult instanceof NextResponse) return authResult;
    const { studentId } = authResult;

    await ensureTeacherPedagogySchema(db);

    const studentResult = await db.query(
      `SELECT s.class_id, s.section_id, c.name AS class_name, sec.name AS section_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       WHERE s.id = $1 AND s.status = 'active'`,
      [studentId],
    );

    const student = studentResult.rows[0] as
      | { class_id: number; section_id: number | null; class_name?: string; section_name?: string }
      | undefined;

    if (!student?.class_id) {
      return NextResponse.json({ success: true, data: [] });
    }

    const subjectId = request.nextUrl.searchParams.get('subject_id');
    const params: unknown[] = [student.class_id, student.section_id];
    let query = `
      SELECT sc.*,
        c.name AS class_name,
        sub.name AS subject_name,
        COALESCE(sp.periods_completed, 0) AS periods_completed,
        COALESCE(sp.status, 'not_started') AS progress_status,
        st.first_name || ' ' || st.last_name AS teacher_name
      FROM syllabus_chapters sc
      LEFT JOIN classes c ON sc.class_id = c.id
      LEFT JOIN subjects sub ON sc.subject_id = sub.id
      LEFT JOIN LATERAL (
        SELECT sp_inner.*
        FROM syllabus_progress sp_inner
        WHERE sp_inner.chapter_id = sc.id
          AND sp_inner.class_id = sc.class_id
          AND (sp_inner.section_id IS NULL OR sp_inner.section_id = $2)
        ORDER BY CASE WHEN sp_inner.section_id = $2 THEN 0 ELSE 1 END, sp_inner.updated_at DESC NULLS LAST
        LIMIT 1
      ) sp ON true
      LEFT JOIN staff st ON sp.staff_id = st.id
      WHERE sc.is_active = true AND sc.class_id = $1`;

    if (subjectId) {
      params.push(parseInt(subjectId, 10));
      query += ` AND sc.subject_id = $${params.length}`;
    }

    query += ' ORDER BY sub.name, sc.sort_order, sc.id';

    const result = await db.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      meta: {
        class_id: student.class_id,
        section_id: student.section_id,
        class_name: student.class_name,
        section_name: student.section_name,
      },
    });
  } catch (error) {
    console.error('Parent syllabus error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch syllabus' },
      { status: 500 },
    );
  }
}
