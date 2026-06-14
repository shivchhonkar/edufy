import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTransportSchema } from '@/lib/ensure-transport-schema';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    const { vehicle_id, assigned_date, shift, status } = await request.json();
    const result = await db.query(
      `UPDATE vehicle_assignments SET vehicle_id=$1, assigned_date=$2, shift=$3, status=$4 WHERE id=$5 RETURNING *`,
      [vehicle_id, assigned_date, shift || 'both', status || 'active', params.id]
    );
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update assignment' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const result = await db.query('DELETE FROM vehicle_assignments WHERE id = $1 RETURNING id', [params.id]);
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Vehicle unassigned from route' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to unassign vehicle' }, { status: 500 });
  }
}
