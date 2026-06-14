import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin, requireHrRead } from '@/lib/hr-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const departmentId = request.nextUrl.searchParams.get('department_id');
    const activeOnly = request.nextUrl.searchParams.get('active_only') === 'true';

    let query = `
      SELECT des.*, d.name AS department_name
      FROM designations des
      LEFT JOIN departments d ON des.department_id = d.id
      WHERE 1=1`;
    const params: number[] = [];

    if (departmentId) {
      params.push(parseInt(departmentId, 10));
      query += ` AND des.department_id = $${params.length}`;
    }
    if (activeOnly) query += ' AND des.is_active = true';
    query += ' ORDER BY des.grade ASC, des.name ASC';

    const result = await db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Designations fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch designations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const { name, grade, department_id, min_salary, max_salary, description, is_active } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO designations (name, grade, department_id, min_salary, max_salary, description, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name.trim(), grade || 1, department_id || null, min_salary || null, max_salary || null, description || null, is_active !== false]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Designation create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create designation' }, { status: 500 });
  }
}
