import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireAuth, getStaffIdForUser } from '@/lib/hr-auth';

async function resolveStaffId(db: Awaited<ReturnType<typeof getRequestDb>>['db'], userId: number): Promise<number | null> {
  let staffId = await getStaffIdForUser(db, userId);
  if (staffId) return staffId;
  const byEmail = await db.query(
    `SELECT s.id FROM staff s JOIN users u ON LOWER(s.email) = LOWER(u.email) WHERE u.id = $1 LIMIT 1`,
    [userId]
  );
  return byEmail.rows[0]?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const staffId = await resolveStaffId(db, auth.user.id!);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const type = request.nextUrl.searchParams.get('type') || 'attendance';
    const month = request.nextUrl.searchParams.get('month');
    const year = request.nextUrl.searchParams.get('year');

    if (type === 'attendance') {
      let query = `SELECT * FROM staff_attendance WHERE staff_id = $1`;
      const params: (number | string)[] = [staffId];
      if (month && year) {
        params.push(parseInt(month, 10), parseInt(year, 10));
        query += ` AND EXTRACT(MONTH FROM attendance_date) = $2 AND EXTRACT(YEAR FROM attendance_date) = $3`;
      }
      query += ' ORDER BY attendance_date DESC LIMIT 60';
      const result = await db.query(query, params);
      return NextResponse.json({ success: true, data: result.rows });
    }

    if (type === 'leaves') {
      const result = await db.query(
        `SELECT sl.*, lt.name AS leave_type_name FROM staff_leaves sl
         LEFT JOIN leave_types lt ON sl.leave_type_id = lt.id
         WHERE sl.staff_id = $1 ORDER BY sl.created_at DESC`,
        [staffId]
      );
      return NextResponse.json({ success: true, data: result.rows });
    }

    if (type === 'payslips') {
      const result = await db.query(
        `SELECT id, month, year, net_salary, status, payment_date, payslip_generated_at
         FROM payroll WHERE staff_id = $1 ORDER BY year DESC, month DESC LIMIT 24`,
        [staffId]
      );
      return NextResponse.json({ success: true, data: result.rows });
    }

    return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireAuth(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const staffId = await resolveStaffId(db, auth.user.id!);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 });
    }

    const { leave_type_id, start_date, end_date, reason } = await request.json();
    if (!leave_type_id || !start_date || !end_date) {
      return NextResponse.json({ success: false, error: 'leave_type_id, start_date, end_date required' }, { status: 400 });
    }

    const s = new Date(start_date);
    const e = new Date(end_date);
    let days = 0;
    const cur = new Date(s);
    while (cur <= e) {
      if (cur.getDay() !== 0 && cur.getDay() !== 6) days++;
      cur.setDate(cur.getDate() + 1);
    }

    const result = await db.query(
      `INSERT INTO staff_leaves (staff_id, leave_type_id, start_date, end_date, days_requested, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [staffId, leave_type_id, start_date, end_date, days, reason || null]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to submit leave' }, { status: 500 });
  }
}
