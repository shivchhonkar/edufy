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
    const result = await db.query('SELECT * FROM leave_types WHERE is_active = true ORDER BY name');
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch leave types' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const { name, description, is_paid, max_days_per_year } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    const result = await db.query(
      `INSERT INTO leave_types (name, description, is_paid, max_days_per_year) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), description || null, is_paid ?? false, max_days_per_year || null]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create leave type' }, { status: 500 });
  }
}
