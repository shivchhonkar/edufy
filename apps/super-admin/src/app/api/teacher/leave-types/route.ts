import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';
import { requireTeacherAuth, resolveStaffId, ensureTeacherSchema } from '@/lib/teacher-auth';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';

export async function GET(request: NextRequest) {
  try {
    const auth = requireTeacherAuth(request);
    if (auth instanceof NextResponse) return auth;

    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    await ensureTeacherSchema(db);
    await ensureHrSchema(db);

    const result = await db.query(
      'SELECT * FROM leave_types WHERE is_active = true ORDER BY name',
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Teacher leave types error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leave types' }, { status: 500 });
  }
}
