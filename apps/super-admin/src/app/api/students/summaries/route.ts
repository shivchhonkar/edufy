import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { JOIN_CURRENT_ENROLLMENT_ON_STUDENT, STUDENT_PLACEMENT_SELECT } from '@/lib/enrollment-sql';
import { classNameOrderSql } from '@/lib/class-sort';
import { studentSearchSql } from '@/lib/student-search';
import { prepareEnrollmentSchema } from '@/lib/enrollment-service';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    const { db } = auth;
    await prepareEnrollmentSchema(db);
    const view = request.nextUrl.searchParams.get('view') || 'class';
    const classId = request.nextUrl.searchParams.get('class_id');
    const sectionId = request.nextUrl.searchParams.get('section_id');
    const search = request.nextUrl.searchParams.get('search')?.trim() || '';
    const status = request.nextUrl.searchParams.get('status') || 'active';

    const conditions = ['s.status = $1'];
    const params: unknown[] = [status];
    let i = 2;
    if (classId) {
      conditions.push(`COALESCE(ce.class_id, s.class_id) = $${i}`);
      params.push(parseInt(classId, 10));
      i += 1;
    }
    if (sectionId) {
      conditions.push(`COALESCE(ce.section_id, s.section_id) = $${i}`);
      params.push(parseInt(sectionId, 10));
      i += 1;
    }
    if (search) {
      conditions.push(studentSearchSql(i));
      params.push(`%${search}%`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;

    if (view === 'students') {
      const result = await db.query(
        `SELECT s.id, s.admission_number, s.first_name, s.last_name, s.gender,
                s.date_of_birth, s.admission_date, s.category, s.religion, s.caste,
                s.parent_name, s.parent_phone, s.mother_name, s.address, s.status,
                ${STUDENT_PLACEMENT_SELECT},
                c.name AS class_name, sec.name AS section_name
         FROM students s
         ${JOIN_CURRENT_ENROLLMENT_ON_STUDENT}
         LEFT JOIN classes c ON COALESCE(ce.class_id, s.class_id) = c.id
         LEFT JOIN sections sec ON COALESCE(ce.section_id, s.section_id) = sec.id
         ${where}
         ORDER BY ${classNameOrderSql('c.name', { prioritizeNull: true })}, sec.name, s.first_name`,
        params
      );
      return NextResponse.json({ success: true, data: result.rows });
    }

    const result = await db.query(
      `SELECT c.id AS class_id, c.name AS class_name,
              sec.id AS section_id, sec.name AS section_name,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE s.gender = 'Male')::int AS male,
              COUNT(*) FILTER (WHERE s.gender = 'Female')::int AS female,
              COUNT(*) FILTER (WHERE s.gender IS NULL OR s.gender NOT IN ('Male', 'Female'))::int AS other,
              COUNT(*) FILTER (WHERE UPPER(COALESCE(s.category, '')) IN ('GEN', 'GENERAL'))::int AS general,
              COUNT(*) FILTER (WHERE UPPER(COALESCE(s.category, '')) = 'OBC')::int AS obc,
              COUNT(*) FILTER (WHERE UPPER(COALESCE(s.category, '')) IN ('SC', 'SC/ST'))::int AS sc,
              COUNT(*) FILTER (WHERE UPPER(COALESCE(s.category, '')) = 'ST')::int AS st,
              COUNT(*) FILTER (WHERE UPPER(COALESCE(s.category, '')) = 'EWS')::int AS ews
       FROM students s
       ${JOIN_CURRENT_ENROLLMENT_ON_STUDENT}
       LEFT JOIN classes c ON COALESCE(ce.class_id, s.class_id) = c.id
       LEFT JOIN sections sec ON COALESCE(ce.section_id, s.section_id) = sec.id
       ${where}
       GROUP BY c.id, c.name, sec.id, sec.name
       ORDER BY ${classNameOrderSql('c.name', { prioritizeNull: true })}, sec.name`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error loading student summaries:', error);
    return NextResponse.json({ success: false, error: 'Failed to load summaries' }, { status: 500 });
  }
}
