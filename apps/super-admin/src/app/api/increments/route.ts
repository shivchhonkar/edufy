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
    const staffId = request.nextUrl.searchParams.get('staff_id');

    let query = `
      SELECT si.*, s.first_name, s.last_name, s.employee_id
      FROM salary_increments si
      JOIN staff s ON si.staff_id = s.id WHERE 1=1`;
    const params: number[] = [];
    if (staffId) {
      params.push(parseInt(staffId, 10));
      query += ` AND si.staff_id = $${params.length}`;
    }
    query += ' ORDER BY si.effective_date DESC';

    const result = await db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch increments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const { staff_id, new_salary, increment_type, effective_date, reason } = await request.json();
    if (!staff_id || !new_salary || !effective_date) {
      return NextResponse.json({ success: false, error: 'staff_id, new_salary, effective_date required' }, { status: 400 });
    }

    const staff = await db.query('SELECT salary FROM staff WHERE id = $1', [staff_id]);
    if (!staff.rows.length) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    const previousSalary = parseFloat(String(staff.rows[0].salary || 0));

    const result = await db.query(
      `INSERT INTO salary_increments (staff_id, previous_salary, new_salary, increment_type, effective_date, reason, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [staff_id, previousSalary, new_salary, increment_type || 'annual', effective_date, reason || null, auth.user.id]
    );

    await db.query('UPDATE staff SET salary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [new_salary, staff_id]);

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to record increment' }, { status: 500 });
  }
}
