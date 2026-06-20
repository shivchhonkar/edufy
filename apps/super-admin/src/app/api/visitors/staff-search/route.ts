import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { staffSearchSql } from '@/lib/staff-search';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    const query = request.nextUrl.searchParams.get('q')?.trim() || '';
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '10', 10), 20);

    if (query.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    await ensureHrSchema(db);

    const result = await db.query(
      `SELECT s.id, s.first_name, s.last_name, s.phone, s.employee_id,
              d.name AS department_name, des.name AS designation_name
       FROM staff s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN designations des ON s.designation_id = des.id
       WHERE s.status = 'active'
         AND ${staffSearchSql(1)}
       ORDER BY s.first_name ASC, s.last_name ASC
       LIMIT $2`,
      [`%${query}%`, limit],
    );

    const data = result.rows.map((row) => ({
      id: row.id,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      phone: row.phone || '',
      employee_id: row.employee_id || '',
      department_name: row.department_name || null,
      designation_name: row.designation_name || null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error searching staff for visitor:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to search staff' },
      { status: 500 },
    );
  }
}
