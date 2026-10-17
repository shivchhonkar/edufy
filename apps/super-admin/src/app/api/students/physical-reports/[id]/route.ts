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
        health_issue = $11,
        attended_by = $12,
        medicine_given = $13,
        issue_status = $14,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $15
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
        body.health_issue?.trim() || null,
        body.attended_by?.trim() || null,
        body.medicine_given?.trim() || null,
        body.health_issue?.trim()
          ? body.issue_status === 'resolved'
            ? 'resolved'
            : 'open'
          : 'none',
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

export async function PATCH(
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
    const status = body.issue_status === 'resolved' || body.issue_status === 'open' ? body.issue_status : null;
    if (!status) {
      return NextResponse.json({ success: false, error: 'issue_status must be open or resolved' }, { status: 400 });
    }
    const result = await auth.db.query(
      `UPDATE student_physical_reports
       SET issue_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND health_issue IS NOT NULL
       RETURNING *`,
      [status, id]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Health issue not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating health issue status:', error);
    return NextResponse.json({ success: false, error: 'Failed to update health issue' }, { status: 500 });
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
