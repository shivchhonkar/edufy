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
      SELECT sp.*, s.first_name, s.last_name, s.employee_id,
        fd.name AS from_designation, td.name AS to_designation
      FROM staff_promotions sp
      JOIN staff s ON sp.staff_id = s.id
      LEFT JOIN designations fd ON sp.from_designation_id = fd.id
      LEFT JOIN designations td ON sp.to_designation_id = td.id
      WHERE 1=1`;
    const params: number[] = [];
    if (staffId) {
      params.push(parseInt(staffId, 10));
      query += ` AND sp.staff_id = $${params.length}`;
    }
    query += ' ORDER BY sp.effective_date DESC';

    const result = await db.query(query, params);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch promotions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const {
      staff_id, to_designation_id, to_salary, effective_date, reason,
    } = await request.json();

    if (!staff_id || !to_designation_id || !effective_date) {
      return NextResponse.json({ success: false, error: 'staff_id, to_designation_id, effective_date required' }, { status: 400 });
    }

    const staff = await db.query('SELECT designation_id, salary FROM staff WHERE id = $1', [staff_id]);
    if (!staff.rows.length) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    const current = staff.rows[0] as { designation_id: number; salary: number };

    const promo = await db.query(
      `INSERT INTO staff_promotions (staff_id, from_designation_id, to_designation_id, from_salary, to_salary, effective_date, reason, approved_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'approved') RETURNING *`,
      [staff_id, current.designation_id, to_designation_id, current.salary, to_salary || current.salary, effective_date, reason || null, auth.user.id]
    );

    await db.query(
      `UPDATE staff SET designation_id = $1, salary = $2, last_designation = designation,
        designation = (SELECT name FROM designations WHERE id = $1), updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [to_designation_id, to_salary || current.salary, staff_id]
    );

    return NextResponse.json({ success: true, data: promo.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Promotion error:', error);
    return NextResponse.json({ success: false, error: 'Failed to record promotion' }, { status: 500 });
  }
}
