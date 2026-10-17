import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';

function parseId(id: string) {
  const value = parseInt(id, 10);
  return Number.isFinite(value) ? value : null;
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
      `UPDATE student_health_issues
       SET issue_status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Health issue not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating health issue:', error);
    return NextResponse.json({ success: false, error: 'Failed to update health issue' }, { status: 500 });
  }
}
