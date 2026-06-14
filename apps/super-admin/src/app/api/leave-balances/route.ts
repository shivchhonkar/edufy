import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrRead } from '@/lib/hr-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const staffId = request.nextUrl.searchParams.get('staff_id');
    const year = parseInt(request.nextUrl.searchParams.get('year') || String(new Date().getFullYear()), 10);

    if (!staffId) {
      return NextResponse.json({ success: false, error: 'staff_id is required' }, { status: 400 });
    }

    const balances = await db.query(
      `SELECT lb.*, lt.name AS leave_type_name, lt.max_days_per_year, lt.is_paid
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.staff_id = $1 AND lb.year = $2 ORDER BY lt.name`,
      [parseInt(staffId, 10), year]
    );

    if (balances.rows.length === 0) {
      const types = await db.query('SELECT * FROM leave_types WHERE is_active = true ORDER BY name');
      const data = types.rows.map((t: { id: number; name: string; max_days_per_year: number; is_paid: boolean }) => ({
        staff_id: parseInt(staffId, 10),
        leave_type_id: t.id,
        leave_type_name: t.name,
        max_days_per_year: t.max_days_per_year,
        is_paid: t.is_paid,
        year,
        allocated: t.max_days_per_year || 0,
        used: 0,
        carried_forward: 0,
      }));
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: true, data: balances.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch leave balances' }, { status: 500 });
  }
}
