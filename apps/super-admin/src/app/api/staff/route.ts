import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin, requireHrRead } from '@/lib/hr-auth';
import { Staff } from '@/shared/types';
import { generateEmployeeId, getPaginationParams } from '@/lib/utils';

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
      designation,
      last_designation,
      department,
      department_id,
      designation_id,
      qualification,
      experience_years,
      date_of_joining,
      employment_type,
      salary,
      notes,
      status_change_date,
    } = body;

    // Validation
    if (!first_name || !last_name || !phone || !date_of_joining || !employment_type) {
      return NextResponse.json(
        { success: false, error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    // Generate employee ID
    const employee_id = generateEmployeeId();

    // Convert empty strings to null for optional fields
    const sanitizedData = {
      date_of_birth: date_of_birth || null,
      email: email || null,
      address: address || null,
      city: city || null,
      state: state || null,
      designation: designation || null,
      last_designation: last_designation || null,
      department: department || null,
      qualification: qualification || null,
      notes: notes || null,
      status_change_date: status_change_date || null,
    };

    const result = await db.query<Staff>(
      `INSERT INTO staff (
        employee_id, first_name, last_name, date_of_birth, gender, phone, email,
        address, city, state, designation, last_designation, department, department_id, designation_id,
        qualification, experience_years, date_of_joining, employment_type, salary, status, notes, status_change_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *`,
      [
        employee_id, first_name, last_name, sanitizedData.date_of_birth, gender, phone, sanitizedData.email,
        sanitizedData.address, sanitizedData.city, sanitizedData.state, sanitizedData.designation,
        sanitizedData.last_designation, sanitizedData.department, department_id || null, designation_id || null,
        sanitizedData.qualification, experience_years,
        date_of_joining, employment_type, salary, 'active', sanitizedData.notes, sanitizedData.status_change_date
      ]
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

