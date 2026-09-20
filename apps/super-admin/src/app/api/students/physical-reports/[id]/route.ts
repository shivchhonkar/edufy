import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';
import { calculateBmi, parseOptionalNumber } from '@/lib/student-operations-utils';

function parseId(id: string) {
  const value = parseInt(id, 10);
  return Number.isFinite(value) ? value : null;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    await ensureStudentOperationsSchema(auth.db);
    const body = await request.json();
    const height = parseOptionalNumber(body.height_cm);
    const weight = parseOptionalNumber(body.weight_kg);

    const result = await auth.db.query(
      `UPDATE student_physical_reports SET
        report_date = COALESCE($1, report_date),
        academic_year = $2,
        height_cm = $3,
        weight_kg = $4,
        bmi = $5,
        chest_cm = $6,
        vision_left = $7,
        vision_right = $8,
        blood_group = $9,
        remarks = $10,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        body.report_date || null,
        body.academic_year || null,
        height,
        weight,
        calculateBmi(height, weight),
        parseOptionalNumber(body.chest_cm),
        body.vision_left?.trim() || null,
        body.vision_right?.trim() || null,
        body.blood_group?.trim() || null,
        body.remarks?.trim() || null,
        id,
      ]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating physical report:', error);
    return NextResponse.json({ success: false, error: 'Failed to update physical report' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    const id = parseId(params.id);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    await ensureStudentOperationsSchema(auth.db);
    await auth.db.query('DELETE FROM student_physical_reports WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting physical report:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete physical report' }, { status: 500 });
  }
}
