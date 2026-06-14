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

    const activeOnly = request.nextUrl.searchParams.get('active_only') === 'true';
    let query = `
      SELECT d.*,
        (SELECT COUNT(*)::int FROM staff s WHERE s.department_id = d.id AND s.status = 'active') AS staff_count,
        hs.first_name || ' ' || hs.last_name AS head_name
      FROM departments d
      LEFT JOIN staff hs ON d.head_staff_id = hs.id
      WHERE 1=1`;
    if (activeOnly) query += ' AND d.is_active = true';
    query += ' ORDER BY d.name ASC';

    const result = await db.query(query);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Departments fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch departments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const { name, code, head_staff_id, description, is_active } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO departments (name, code, head_staff_id, description, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), code?.trim() || null, head_staff_id || null, description || null, is_active !== false]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ success: false, error: 'Department name or code already exists' }, { status: 409 });
    }
    console.error('Department create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create department' }, { status: 500 });
  }
}
