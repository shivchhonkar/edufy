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
      `SELECT ssa.*, sh.name AS shift_name, sh.start_time, sh.end_time
       FROM staff_shift_assignments ssa
       JOIN shifts sh ON ssa.shift_id = sh.id
       WHERE ssa.staff_id = $1 AND (ssa.effective_to IS NULL OR ssa.effective_to >= CURRENT_DATE)
       ORDER BY ssa.effective_from DESC LIMIT 1`,
      [params.id]
    );
    return NextResponse.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch shift assignment' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const { shift_id, effective_from, effective_to } = await request.json();
    if (!shift_id || !effective_from) {
      return NextResponse.json({ success: false, error: 'shift_id and effective_from required' }, { status: 400 });
    }

    await db.query(
      `UPDATE staff_shift_assignments SET effective_to = $1
       WHERE staff_id = $2 AND effective_to IS NULL`,
      [effective_from, params.id]
    );

    const result = await db.query(
      `INSERT INTO staff_shift_assignments (staff_id, shift_id, effective_from, effective_to)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [params.id, shift_id, effective_from, effective_to || null]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to assign shift' }, { status: 500 });
  }
}
