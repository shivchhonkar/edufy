import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin, requireHrRead } from '@/lib/hr-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const result = await db.query(
      `SELECT s.*, d.name AS department_name, des.name AS designation_name
       FROM staff s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN designations des ON s.designation_id = des.id
       WHERE s.id = $1`,
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch staff member' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const body = await request.json();
    const {
      first_name, last_name, date_of_birth, gender, phone, email, address, city, state,
      designation, last_designation, department, department_id, designation_id,
      qualification, experience_years, date_of_joining, employment_type, salary,
      photo_url, status, notes, status_change_date,
      bank_account_number, bank_name, bank_ifsc, emergency_contact,
    } = body;

    const result = await db.query(
      `UPDATE staff SET
        first_name = $1, last_name = $2, date_of_birth = $3, gender = $4, phone = $5,
        email = $6, address = $7, city = $8, state = $9, designation = $10,
        last_designation = $11, department = $12, department_id = $13, designation_id = $14,
        qualification = $15, experience_years = $16, date_of_joining = $17,
        employment_type = $18, salary = $19, photo_url = $20, status = $21,
        notes = $22, status_change_date = $23,
        bank_account_number = $24, bank_name = $25, bank_ifsc = $26, emergency_contact = $27,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $28 RETURNING *`,
      [
        first_name, last_name, date_of_birth || null, gender, phone, email || null,
        address || null, city || null, state || null, designation || null,
        last_designation || null, department || null, department_id || null, designation_id || null,
        qualification || null, experience_years || null, date_of_joining, employment_type,
        salary || null, photo_url || null, status || 'active', notes || null,
        status_change_date || null, bank_account_number || null, bank_name || null,
        bank_ifsc || null, emergency_contact || null, params.id,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json({ success: false, error: 'Failed to update staff member' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    const result = await db.query('DELETE FROM staff WHERE id = $1 RETURNING *', [params.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete staff member' }, { status: 500 });
  }
}
