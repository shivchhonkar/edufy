import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { ensureClassSubjectsSchema } from '@/lib/ensure-class-subjects-schema';
import { ensureTimetableSchema } from '@/lib/ensure-timetable-schema';
import { requireHrRead } from '@/lib/hr-auth';
import { classNameOrderSql } from '@/lib/class-sort';

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    await ensureClassSubjectsSchema(db);
    await ensureTimetableSchema(db);

    const academicYear = request.nextUrl.searchParams.get('academic_year');

    const yearParams: string[] = [];
    let yearFilter = '';
    if (academicYear) {
      yearParams.push(academicYear);
      yearFilter = ` AND ta.academic_year = $${yearParams.length}`;
    }

    const assignmentsResult = await db.query(
      `
      SELECT
        ta.id,
        ta.staff_id,
        ta.class_id,
        ta.section_id,
        ta.subject_id,
        ta.academic_year,
        ta.is_class_teacher,
        ta.created_at AS assigned_since,
        s.first_name || ' ' || s.last_name AS teacher_name,
        s.employee_id,
        c.name AS class_name,
        sec.name AS section_name,
        sub.name AS subject_name,
        sub.code AS subject_code
      FROM teacher_assignments ta
      JOIN staff s ON ta.staff_id = s.id
      LEFT JOIN classes c ON ta.class_id = c.id
      LEFT JOIN sections sec ON ta.section_id = sec.id
      LEFT JOIN subjects sub ON ta.subject_id = sub.id
      WHERE 1=1${yearFilter}
      ORDER BY ${classNameOrderSql('c.name')}, sec.name NULLS FIRST, sub.name NULLS FIRST, teacher_name
      `,
      yearParams,
    );

    const classSubjectsResult = await db.query(
      `
      SELECT
        cs.id,
        cs.class_id,
        cs.subject_id,
        cs.created_at AS assigned_since,
        c.name AS class_name,
        s.name AS subject_name,
        s.code AS subject_code
      FROM class_subjects cs
      JOIN classes c ON cs.class_id = c.id
      JOIN subjects s ON cs.subject_id = s.id
      ORDER BY ${classNameOrderSql('c.name')}, s.name
      `,
    );

    const workloadParams = academicYear ? [academicYear] : [];
    const workloadYearFilter = academicYear ? ' AND ta.academic_year = $1' : '';
    const timetableYearFilter = academicYear ? ' AND ct.academic_year = $1' : '';

    const workloadResult = await db.query(
      `
      SELECT
        ta.staff_id,
        MAX(s.first_name || ' ' || s.last_name) AS teacher_name,
        MAX(s.employee_id) AS employee_id,
        COUNT(*)::int AS total_assignments,
        COUNT(DISTINCT ta.class_id)::int AS classes_count,
        COUNT(DISTINCT ta.subject_id)::int AS subjects_count,
        COUNT(DISTINCT ta.section_id)::int AS sections_count,
        SUM(CASE WHEN ta.is_class_teacher THEN 1 ELSE 0 END)::int AS class_teacher_roles,
        (
          SELECT COUNT(*)::int
          FROM class_timetable ct
          WHERE ct.staff_id = ta.staff_id${timetableYearFilter}
        ) AS timetable_periods
      FROM teacher_assignments ta
      JOIN staff s ON ta.staff_id = s.id
      WHERE 1=1${workloadYearFilter}
      GROUP BY ta.staff_id
      ORDER BY teacher_name
      `,
      workloadParams,
    );

    const coTeachingParams = academicYear ? [academicYear] : [];
    const coTeachingYearFilter = academicYear ? ' AND ta.academic_year = $1' : '';

    const coTeachingResult = await db.query(
      `
      SELECT
        ta.class_id,
        ta.section_id,
        ta.subject_id,
        ta.academic_year,
        MAX(c.name) AS class_name,
        MAX(sec.name) AS section_name,
        MAX(sub.name) AS subject_name,
        MAX(sub.code) AS subject_code,
        COUNT(DISTINCT ta.staff_id)::int AS teacher_count,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'staff_id', ta.staff_id,
            'teacher_name', s.first_name || ' ' || s.last_name,
            'employee_id', s.employee_id,
            'is_class_teacher', ta.is_class_teacher,
            'assigned_since', ta.created_at
          )
          ORDER BY ta.is_class_teacher DESC, s.first_name, s.last_name
        ) AS teachers
      FROM teacher_assignments ta
      JOIN staff s ON ta.staff_id = s.id
      LEFT JOIN classes c ON ta.class_id = c.id
      LEFT JOIN sections sec ON ta.section_id = sec.id
      LEFT JOIN subjects sub ON ta.subject_id = sub.id
      WHERE ta.subject_id IS NOT NULL${coTeachingYearFilter}
      GROUP BY ta.class_id, ta.section_id, ta.subject_id, ta.academic_year
      HAVING COUNT(DISTINCT ta.staff_id) > 1
      ORDER BY ${classNameOrderSql('MAX(c.name)')}, MAX(sec.name), MAX(sub.name)
      `,
      coTeachingParams,
    );

    return NextResponse.json({
      success: true,
      data: {
        assignments: assignmentsResult.rows,
        classSubjects: classSubjectsResult.rows,
        workload: workloadResult.rows,
        coTeaching: coTeachingResult.rows,
      },
    });
  } catch (error) {
    console.error('Academic assignments overview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load academic assignments overview' },
      { status: 500 },
    );
  }
}
