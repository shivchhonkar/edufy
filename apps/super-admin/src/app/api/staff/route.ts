import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin, requireHrRead } from '@/lib/hr-auth';
import { Staff } from '@/shared/types';
import { generateEmployeeId, getPaginationParams } from '@/lib/utils';
import { STAFF_WRITE_COLUMNS, staffWriteParams, staffWriteValues } from '@/lib/staff-write-values';
import { applyStaffTypeDefaults } from '@/lib/teachers-query';

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // Don't default to 'active', allow null
    const department = searchParams.get('department');

    const { offset, limit: pageLimit } = getPaginationParams(page, limit);

    let queryText = `SELECT s.*, d.name AS department_name, des.name AS designation_name
      FROM staff s
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN designations des ON s.designation_id = des.id
      WHERE 1=1`;
    let queryParams: any[] = [];
    let paramCount = 0;

    // Add status filter only if status is provided
    if (status) {
      paramCount++;
      queryText += ` AND status = $${paramCount}`;
      queryParams.push(status);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR employee_id ILIKE $${paramCount} OR phone ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (department) {
      paramCount++;
      queryText += ` AND department = $${paramCount}`;
      queryParams.push(department);
    }

    queryText += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(pageLimit, offset);

    const result = await db.query<Staff>(queryText, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM staff WHERE 1=1';
    let countParams: any[] = [];
    let countParamCount = 0;
    
    if (status) {
      countParamCount++;
      countQuery += ` AND status = $${countParamCount}`;
      countParams.push(status);
    }
    
    if (search) {
      countParamCount++;
      countQuery += ` AND (first_name ILIKE $${countParamCount} OR last_name ILIKE $${countParamCount} OR employee_id ILIKE $${countParamCount} OR phone ILIKE $${countParamCount})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

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
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch staff' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const body = await request.json();
    const fields = await applyStaffTypeDefaults(db, staffWriteValues(body));

    if (!fields.first_name || !fields.last_name || !fields.phone || !fields.date_of_joining || !fields.employment_type) {
      return NextResponse.json(
        { success: false, error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    let employee_id = String(body.employee_id || '').trim();
    if (employee_id) {
      const existing = await db.query('SELECT id FROM staff WHERE employee_id = $1', [employee_id]);
      if (existing.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Employee ID already exists' },
          { status: 400 }
        );
      }
    } else {
      employee_id = generateEmployeeId();
    }

    const status = body.status === 'inactive' ? 'inactive' : 'active';
    const placeholders = STAFF_WRITE_COLUMNS.map((_, i) => `$${i + 3}`).join(', ');
    const result = await db.query<Staff>(
      `INSERT INTO staff (employee_id, status, ${STAFF_WRITE_COLUMNS.join(', ')})
       VALUES ($1, $2, ${placeholders})
       RETURNING *`,
      [employee_id, status, ...staffWriteParams(fields)]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Staff member created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create staff member' },
      { status: 500 }
    );
  }
}

