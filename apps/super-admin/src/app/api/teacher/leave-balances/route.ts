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

    const staffId = await resolveStaffId(db, auth.user.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const year = parseInt(
      request.nextUrl.searchParams.get('year') || String(new Date().getFullYear()),
      10,
    );

    const balances = await db.query(
      `SELECT lb.*, lt.name AS leave_type_name, lt.max_days_per_year, lt.is_paid
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.staff_id = $1 AND lb.year = $2
       ORDER BY lt.name`,
      [staffId, year],
    );

    if (balances.rows.length === 0) {
      const types = await db.query(
        'SELECT * FROM leave_types WHERE is_active = true ORDER BY name',
      );
      const data = types.rows.map(
        (type: { id: number; name: string; max_days_per_year: number; is_paid: boolean }) => ({
          staff_id: staffId,
          leave_type_id: type.id,
          leave_type_name: type.name,
          max_days_per_year: type.max_days_per_year,
          is_paid: type.is_paid,
          year,
          allocated: type.max_days_per_year || 0,
          used: 0,
          carried_forward: 0,
          remaining: type.max_days_per_year || 0,
        }),
      );
      return NextResponse.json({ success: true, data });
    }

    const data = balances.rows.map((row) => ({
      ...row,
      remaining: Math.max(
        Number(row.allocated ?? row.max_days_per_year ?? 0) +
          Number(row.carried_forward ?? 0) -
          Number(row.used ?? 0),
        0,
      ),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Teacher leave balances error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leave balances' }, { status: 500 });
  }
}
