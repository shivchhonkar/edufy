import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getAuthenticatedDb(request);
    if (auth instanceof NextResponse) return auth;
    const id = parseInt(params.id, 10);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    await ensureStudentOperationsSchema(auth.db);
    await auth.db.query('DELETE FROM student_late_passes WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting late pass:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete late pass' }, { status: 500 });
  }
}
