import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin, requireHrRead } from '@/lib/hr-auth';

function countWorkingDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const staffId = request.nextUrl.searchParams.get('staff_id');
    const status = request.nextUrl.searchParams.get('status');
    const year = request.nextUrl.searchParams.get('year');

    let query = `
      SELECT sl.*, lt.name AS leave_type_name, lt.is_paid,
        s.first_name, s.last_name, s.employee_id,
        ab.first_name || ' ' || ab.last_name AS approved_by_name
      FROM staff_leaves sl
      JOIN staff s ON sl.staff_id = s.id
      LEFT JOIN leave_types lt ON sl.leave_type_id = lt.id
      LEFT JOIN staff ab ON sl.approved_by = ab.id
      WHERE 1=1`;
    const params: (string | number)[] = [];

    if (staffId) {
      params.push(parseInt(staffId, 10));
      query += ` AND sl.staff_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND sl.status = $${params.length}`;
    }
    if (year) {
      params.push(parseInt(year, 10));
      query += ` AND EXTRACT(YEAR FROM sl.start_date) = $${params.length}`;
    }
    query += ' ORDER BY sl.created_at DESC';

    const result = await db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Leaves fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch leaves' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const body = await request.json();
    let { staff_id, leave_type_id, start_date, end_date, reason } = body;

    if (!staff_id || !leave_type_id || !start_date || !end_date) {
      return NextResponse.json({ success: false, error: 'staff_id, leave_type_id, start_date, end_date required' }, { status: 400 });
    }

    const daysRequested = countWorkingDays(start_date, end_date);
    const result = await db.query(
      `INSERT INTO staff_leaves (staff_id, leave_type_id, start_date, end_date, days_requested, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [staff_id, leave_type_id, start_date, end_date, daysRequested, reason || null]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Leave create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create leave request' }, { status: 500 });
  }
}
