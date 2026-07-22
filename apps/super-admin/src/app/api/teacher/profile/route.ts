import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireTeacherAuth, resolveStaffId, ensureTeacherSchema } from '@/lib/teacher-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireTeacherAuth(request);
    if (auth instanceof NextResponse) return auth;

    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    await ensureTeacherSchema(db);

    const staffId = await resolveStaffId(db, auth.user.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const result = await db.query(
      `SELECT
        u.id,
        u.email,
        u.role,
        u.full_name,
        u.phone,
        s.id AS staff_id,
        s.employee_id,
        s.first_name,
        s.last_name,
        s.phone AS staff_phone,
        s.email AS staff_email,
        s.designation,
        s.department,
        s.date_of_joining,
        s.employment_type,
        s.qualification,
        s.experience_years,
        s.photo_url,
        (
          SELECT string_agg(DISTINCT sub.name, ', ' ORDER BY sub.name)
          FROM teacher_assignments ta
          JOIN subjects sub ON ta.subject_id = sub.id
          WHERE ta.staff_id = s.id
        ) AS subjects
      FROM staff s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1`,
      [staffId],
    );

    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 });
    }

    const row = result.rows[0];
    return NextResponse.json({
      success: true,
      data: {
        id: Number(row.id),
        login: row.email ?? row.staff_email ?? '',
        full_name: row.full_name ?? `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
        role: row.role,
        phone: row.phone ?? row.staff_phone ?? null,
        employee_id: row.employee_id ?? null,
        photo_url: row.photo_url ?? null,
        subject: row.subjects ?? null,
        staff_id: Number(row.staff_id),
        designation: row.designation ?? null,
        department_name: row.department ?? null,
        date_of_joining: row.date_of_joining ?? null,
        employment_type: row.employment_type ?? null,
        qualification: row.qualification ?? null,
        experience_years: row.experience_years ?? null,
        email: row.email ?? row.staff_email ?? null,
      },
    });
  } catch (error) {
    console.error('Teacher profile error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch profile' },
      { status: 500 },
    );
  }
}
