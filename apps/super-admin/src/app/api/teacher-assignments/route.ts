import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin, requireHrRead } from '@/lib/hr-auth';
import { classNameOrderSql } from '@/lib/class-sort';

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const academicYear = request.nextUrl.searchParams.get('academic_year');
    const staffId = request.nextUrl.searchParams.get('staff_id');
    const classId = request.nextUrl.searchParams.get('class_id');

    let query = `
      SELECT ta.*, s.first_name || ' ' || s.last_name AS teacher_name, s.employee_id,
        c.name AS class_name, sec.name AS section_name, sub.name AS subject_name
      FROM teacher_assignments ta
      JOIN staff s ON ta.staff_id = s.id
      LEFT JOIN classes c ON ta.class_id = c.id
      LEFT JOIN sections sec ON ta.section_id = sec.id
      LEFT JOIN subjects sub ON ta.subject_id = sub.id
      WHERE 1=1`;
    const params: (string | number)[] = [];

    if (academicYear) {
      params.push(academicYear);
      query += ` AND ta.academic_year = $${params.length}`;
    }
    if (staffId) {
      params.push(parseInt(staffId, 10));
      query += ` AND ta.staff_id = $${params.length}`;
    }
    if (classId) {
      params.push(parseInt(classId, 10));
      query += ` AND ta.class_id = $${params.length}`;
    }
    query += ` ORDER BY ${classNameOrderSql('c.name')}, sec.name, sub.name`;

    const result = await db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Teacher assignments fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch teacher assignments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const { staff_id, class_id, section_id, subject_id, academic_year, is_class_teacher } = await request.json();
    if (!staff_id || !class_id || !academic_year) {
      return NextResponse.json({ success: false, error: 'staff_id, class_id, academic_year required' }, { status: 400 });
    }

    if (is_class_teacher && section_id) {
      await db.query(
        `UPDATE sections SET class_teacher_id = $1 WHERE id = $2`,
        [staff_id, section_id]
      ).catch(() => {});
    }

    const result = await db.query(
      `INSERT INTO teacher_assignments (staff_id, class_id, section_id, subject_id, academic_year, is_class_teacher)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (staff_id, class_id, section_id, subject_id, academic_year)
       DO UPDATE SET is_class_teacher = $6
       RETURNING *`,
      [staff_id, class_id, section_id || null, subject_id || null, academic_year, is_class_teacher ?? false]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Teacher assignment create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create teacher assignment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });
    }
    const result = await db.query('DELETE FROM teacher_assignments WHERE id = $1 RETURNING id', [id]);
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Assignment removed' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete assignment' }, { status: 500 });
  }
}
