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
    const activeOnly = request.nextUrl.searchParams.get('active_only') === 'true';
    let query = 'SELECT * FROM shifts WHERE 1=1';
    if (activeOnly) query += ' AND is_active = true';
    query += ' ORDER BY start_time';
    const result = await db.query(query);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch shifts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const { name, start_time, end_time, break_minutes, is_active } = await request.json();
    if (!name?.trim() || !start_time || !end_time) {
      return NextResponse.json({ success: false, error: 'name, start_time, end_time required' }, { status: 400 });
    }
    const result = await db.query(
      `INSERT INTO shifts (name, start_time, end_time, break_minutes, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name.trim(), start_time, end_time, break_minutes ?? 60, is_active !== false]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to create shift' }, { status: 500 });
  }
}
