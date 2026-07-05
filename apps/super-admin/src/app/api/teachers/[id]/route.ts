import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin, requireHrRead } from '@/lib/hr-auth';
import { resolveTeachingDepartmentId, TEACHER_LIST_SELECT, TEACHER_WHERE_CLAUSE } from '@/lib/teachers-query';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const result = await db.query(
      `${TEACHER_LIST_SELECT} WHERE s.id = $1 AND ${TEACHER_WHERE_CLAUSE}`,
      [params.id],
    );

    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Teacher not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching teacher:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch teacher' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const body = await request.json();

    const {
      first_name,
      last_name,
      date_of_birth,
      gender,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      designation,
      qualification,
      experience_years,
      date_of_joining,
      employment_type,
      salary,
      status,
      notes,
    } = body;

    if (!first_name?.trim() || !last_name?.trim() || !phone?.trim() || !date_of_joining || !employment_type) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, phone, joining date, and employment type are required' },
        { status: 400 },
      );
    }

    const teachingDepartmentId = await resolveTeachingDepartmentId(db);

    const result = await db.query(
      `UPDATE staff SET
        first_name = $1,
        last_name = $2,
        date_of_birth = $3,
        gender = $4,
        phone = $5,
        email = $6,
        address = $7,
        city = $8,
        state = $9,
        pincode = $10,
        designation = $11,
        department = $12,
        department_id = $13,
        qualification = $14,
        experience_years = $15,
        date_of_joining = $16,
        employment_type = $17,
        salary = $18,
        status = COALESCE($19, status),
        notes = $20,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $21
      RETURNING *`,
      [
        first_name.trim(),
        last_name.trim(),
        date_of_birth || null,
        gender || 'Male',
        phone.trim(),
        email?.trim() || null,
        address?.trim() || null,
        city?.trim() || null,
        state?.trim() || null,
        pincode?.trim() || null,
        designation?.trim() || 'Teacher',
        'Teaching',
        teachingDepartmentId,
        qualification?.trim() || null,
        experience_years ?? null,
        date_of_joining,
        employment_type,
        salary ?? null,
        status || 'active',
        notes?.trim() || null,
        params.id,
      ],
    );

    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Teacher not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Teacher updated successfully',
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    return NextResponse.json({ success: false, error: 'Failed to update teacher' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const inUse = await db.query(
      `SELECT COUNT(*)::int AS count FROM teacher_assignments WHERE staff_id = $1`,
      [params.id],
    );
    const assignmentCount = (inUse.rows[0] as { count: number }).count;

    if (assignmentCount > 0) {
      const result = await db.query(
        `UPDATE staff SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
        [params.id],
      );
      if (!result.rows.length) {
        return NextResponse.json({ success: false, error: 'Teacher not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        message: 'Teacher has active assignments and was marked inactive instead of deleted',
        data: result.rows[0],
      });
    }

    const result = await db.query('DELETE FROM staff WHERE id = $1 RETURNING *', [params.id]);
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Teacher not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete teacher' }, { status: 500 });
  }
}
