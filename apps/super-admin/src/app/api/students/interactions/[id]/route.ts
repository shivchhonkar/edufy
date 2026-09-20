import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';
import { isInteractionType, parseOptionalNumber } from '@/lib/student-operations-utils';

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

    if (body.interaction_type && !isInteractionType(body.interaction_type)) {
      return NextResponse.json({ success: false, error: 'Invalid interaction type' }, { status: 400 });
    }

    const result = await auth.db.query(
      `UPDATE student_interactions SET
        interaction_type = COALESCE($1, interaction_type),
        student_id = $2,
        student_name = COALESCE($3, student_name),
        interaction_date = COALESCE($4, interaction_date),
        subject = COALESCE($5, subject),
        description = $6,
        follow_up_date = $7,
        status = COALESCE($8, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        body.interaction_type || null,
        parseOptionalNumber(body.student_id),
        body.student_name?.trim() || null,
        body.interaction_date || null,
        body.subject?.trim() || null,
        body.description?.trim() || null,
        body.follow_up_date || null,
        body.status || null,
        id,
      ]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating interaction:', error);
    return NextResponse.json({ success: false, error: 'Failed to update interaction' }, { status: 500 });
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
    await auth.db.query('DELETE FROM student_interactions WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting interaction:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete interaction' }, { status: 500 });
  }
}
