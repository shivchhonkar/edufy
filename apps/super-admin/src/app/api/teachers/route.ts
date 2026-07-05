import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin, requireHrRead } from '@/lib/hr-auth';
import { generateEmployeeId, getPaginationParams } from '@/lib/utils';
import { resolveTeachingDepartmentId, TEACHER_LIST_SELECT, TEACHER_WHERE_CLAUSE } from '@/lib/teachers-query';
import type { Staff } from '@/shared/types';

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');

    const { offset, limit: pageLimit } = getPaginationParams(page, limit);

    let queryText = `${TEACHER_LIST_SELECT} WHERE ${TEACHER_WHERE_CLAUSE}`;
    const queryParams: (string | number)[] = [];
    let paramCount = 0;

    if (status) {
      paramCount += 1;
      queryText += ` AND s.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (search) {
      paramCount += 1;
      queryText += ` AND (
        s.first_name ILIKE $${paramCount}
        OR s.last_name ILIKE $${paramCount}
        OR s.employee_id ILIKE $${paramCount}
        OR s.phone ILIKE $${paramCount}
        OR s.email ILIKE $${paramCount}
      )`;
      queryParams.push(`%${search}%`);
    }

    queryText += ` ORDER BY s.first_name, s.last_name LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(pageLimit, offset);

    const result = await db.query<Staff & { assignment_count: number }>(queryText, queryParams);

    let countQuery = `
      SELECT COUNT(*)::int AS count
      FROM staff s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN designations des ON s.designation_id = des.id
      WHERE ${TEACHER_WHERE_CLAUSE}`;
    const countParams: string[] = [];
    let countParamCount = 0;

    if (status) {
      countParamCount += 1;
      countQuery += ` AND s.status = $${countParamCount}`;
      countParams.push(status);
    }

    if (search) {
      countParamCount += 1;
      countQuery += ` AND (
        s.first_name ILIKE $${countParamCount}
        OR s.last_name ILIKE $${countParamCount}
        OR s.employee_id ILIKE $${countParamCount}
        OR s.phone ILIKE $${countParamCount}
        OR s.email ILIKE $${countParamCount}
      )`;
      countParams.push(`%${search}%`);
    }

    const countResult = await db.query<{ count: number }>(countQuery, countParams);
    const total = countResult.rows[0]?.count ?? 0;

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit: pageLimit,
        total,
        totalPages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch teachers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
      notes,
    } = body;

    if (!first_name?.trim() || !last_name?.trim() || !phone?.trim() || !date_of_joining || !employment_type) {
      return NextResponse.json(
        { success: false, error: 'First name, last name, phone, joining date, and employment type are required' },
        { status: 400 },
      );
    }

    const teachingDepartmentId = await resolveTeachingDepartmentId(db);
    const employee_id = generateEmployeeId();

    const result = await db.query<Staff>(
      `INSERT INTO staff (
        employee_id, first_name, last_name, date_of_birth, gender, phone, email,
        address, city, state, pincode, designation, department, department_id,
        qualification, experience_years, date_of_joining, employment_type, salary, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        employee_id,
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
        'active',
        notes?.trim() || null,
      ],
    );

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
        message: 'Teacher created successfully',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating teacher:', error);
    return NextResponse.json({ success: false, error: 'Failed to create teacher' }, { status: 500 });
  }
}
