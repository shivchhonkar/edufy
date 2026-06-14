import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin, requireHrRead } from '@/lib/hr-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const status = request.nextUrl.searchParams.get('status');

    let query = `
      SELECT r.*, s.first_name, s.last_name, s.employee_id, s.department
      FROM resignations r
      JOIN staff s ON r.staff_id = s.id WHERE 1=1`;
    const params: string[] = [];
    if (status) {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }
    query += ' ORDER BY r.created_at DESC';

    const result = await db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch resignations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const { staff_id, resignation_date, last_working_day, notice_period_days, reason } = await request.json();
    if (!staff_id || !resignation_date || !last_working_day) {
      return NextResponse.json({ success: false, error: 'staff_id, resignation_date, last_working_day required' }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO resignations (staff_id, resignation_date, last_working_day, notice_period_days, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [staff_id, resignation_date, last_working_day, notice_period_days ?? 30, reason || null]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create resignation' }, { status: 500 });
  }
}
