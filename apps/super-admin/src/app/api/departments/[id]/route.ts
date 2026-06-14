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
    const result = await db.query('SELECT * FROM departments WHERE id = $1', [params.id]);
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Department not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Department fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch department' }, { status: 500 });
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
    const { name, code, head_staff_id, description, is_active } = await request.json();

    const result = await db.query(
      `UPDATE departments SET
        name = COALESCE($1, name),
        code = $2,
        head_staff_id = $3,
        description = $4,
        is_active = COALESCE($5, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 RETURNING *`,
      [name?.trim(), code?.trim() || null, head_staff_id || null, description || null, is_active, params.id]
    );
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Department not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Department update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update department' }, { status: 500 });
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

    const inUse = await db.query(
      'SELECT COUNT(*)::int AS cnt FROM staff WHERE department_id = $1',
      [params.id]
    );
    if (inUse.rows[0]?.cnt > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete department with assigned staff. Deactivate instead.' },
        { status: 400 }
      );
    }

    const result = await db.query('DELETE FROM departments WHERE id = $1 RETURNING id', [params.id]);
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Department not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Department deleted' });
  } catch (error) {
    console.error('Department delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete department' }, { status: 500 });
  }
}
