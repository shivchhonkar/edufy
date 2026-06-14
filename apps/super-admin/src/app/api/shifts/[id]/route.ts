import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin } from '@/lib/hr-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const { name, start_time, end_time, break_minutes, is_active } = await request.json();
    const result = await db.query(
      `UPDATE shifts SET name = COALESCE($1, name), start_time = COALESCE($2, start_time),
        end_time = COALESCE($3, end_time), break_minutes = COALESCE($4, break_minutes),
        is_active = COALESCE($5, is_active) WHERE id = $6 RETURNING *`,
      [name?.trim(), start_time, end_time, break_minutes, is_active, params.id]
    );
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Shift not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update shift' }, { status: 500 });
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
    const result = await db.query('DELETE FROM shifts WHERE id = $1 RETURNING id', [params.id]);
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Shift not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Shift deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete shift' }, { status: 500 });
  }
}
