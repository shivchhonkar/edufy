import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin, requireHrRead } from '@/lib/hr-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const result = await db.query(
      `SELECT des.*, d.name AS department_name FROM designations des
       LEFT JOIN departments d ON des.department_id = d.id WHERE des.id = $1`,
      [params.id]
    );
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Designation not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch designation' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const { name, grade, department_id, min_salary, max_salary, description, is_active } = await request.json();

    const result = await db.query(
      `UPDATE designations SET
        name = COALESCE($1, name), grade = COALESCE($2, grade),
        department_id = $3, min_salary = $4, max_salary = $5,
        description = $6, is_active = COALESCE($7, is_active), updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 RETURNING *`,
      [name?.trim(), grade, department_id || null, min_salary || null, max_salary || null, description || null, is_active, params.id]
    );
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Designation not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update designation' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const inUse = await db.query('SELECT COUNT(*)::int AS cnt FROM staff WHERE designation_id = $1', [params.id]);
    if (inUse.rows[0]?.cnt > 0) {
      return NextResponse.json({ success: false, error: 'Cannot delete designation with assigned staff' }, { status: 400 });
    }

    const result = await db.query('DELETE FROM designations WHERE id = $1 RETURNING id', [params.id]);
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Designation not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Designation deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete designation' }, { status: 500 });
  }
}
