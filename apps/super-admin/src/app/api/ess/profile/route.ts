import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireAuth, getStaffIdForUser } from '@/lib/hr-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const staffId = await getStaffIdForUser(db, auth.user.id!);
    if (!staffId) {
      const staffByEmail = await db.query(
        `SELECT s.* FROM staff s JOIN users u ON LOWER(s.email) = LOWER(u.email) WHERE u.id = $1 LIMIT 1`,
        [auth.user.id]
      );
      if (!staffByEmail.rows.length) {
        return NextResponse.json({ success: false, error: 'No staff profile linked to your account' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: staffByEmail.rows[0] });
    }

    const result = await db.query(
      `SELECT s.*, d.name AS department_name, des.name AS designation_name
       FROM staff s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN designations des ON s.designation_id = des.id
       WHERE s.id = $1`,
      [staffId]
    );
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch profile' }, { status: 500 });
  }
}
