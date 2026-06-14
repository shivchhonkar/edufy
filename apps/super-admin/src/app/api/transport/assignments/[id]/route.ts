import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTransportSchema } from '@/lib/ensure-transport-schema';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import { syncTransportFeesForStudent } from '@/lib/transport-fee-sync';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    const result = await db.query(
      `SELECT st.*, s.admission_number, s.first_name, s.last_name, c.name as class_name,
              sec.name as section_name, r.route_name, rs.stop_name
       FROM student_transport st
       JOIN students s ON st.student_id = s.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN sections sec ON s.section_id = sec.id
       JOIN routes r ON st.route_id = r.id
       LEFT JOIN route_stops rs ON st.stop_id = rs.id
       WHERE st.id = $1`,
      [params.id]
    );
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch assignment' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    const { route_id, stop_id, transport_fee, start_date, end_date, status } = await request.json();

    let fee = transport_fee;
    if ((fee == null || fee === '') && stop_id) {
      const stop = await db.query<{ pickup_fee: number | null }>('SELECT pickup_fee FROM route_stops WHERE id = $1', [stop_id]);
      fee = stop.rows[0]?.pickup_fee ?? null;
    }

    const result = await db.query(
      `UPDATE student_transport SET route_id=$1, stop_id=$2, transport_fee=$3, start_date=$4, end_date=$5, status=$6
       WHERE id=$7 RETURNING *`,
      [route_id, stop_id || null, fee, start_date, end_date || null, status || 'active', params.id]
    );
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    await ensureFeeSchema(db);
    const academicYear = await resolveAcademicYear(db, null);
    const updated = result.rows[0] as { student_id: number };
    await syncTransportFeesForStudent(db, updated.student_id, academicYear);

    return NextResponse.json({ success: true, data: result.rows[0], message: 'Assignment updated' });
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
    const result = await db.query<{ student_id: number }>(
      'DELETE FROM student_transport WHERE id = $1 RETURNING student_id',
      [params.id]
    );
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    await ensureFeeSchema(db);
    const academicYear = await resolveAcademicYear(db, null);
    await syncTransportFeesForStudent(db, result.rows[0].student_id, academicYear);

    return NextResponse.json({ success: true, message: 'Assignment removed successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete assignment' }, { status: 500 });
  }
}
