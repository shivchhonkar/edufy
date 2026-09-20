import { NextRequest, NextResponse } from 'next/server';
import { requireLibrary } from '@/lib/library-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const search = request.nextUrl.searchParams.get('search')?.trim() || '';
    const params: unknown[] = [];
    let where = `WHERE COALESCE(s.status, 'active') ILIKE 'active'`;
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (s.first_name ILIKE $1 OR s.last_name ILIKE $1 OR s.employee_id ILIKE $1)`;
    }
    try {
    try {
      const result = await auth.db.query(
        `SELECT s.id, s.first_name, s.last_name, s.employee_id, s.phone,
                d.name AS department_name, des.name AS designation_name
         FROM staff s
         LEFT JOIN departments d ON d.id = s.department_id
         LEFT JOIN designations des ON des.id = s.designation_id
         ${where}
         ORDER BY s.first_name, s.last_name
         LIMIT 40`,
        params
      );
      return NextResponse.json({ success: true, data: result.rows });
    } catch {
      const fallback = await auth.db.query(
        `SELECT id, first_name, last_name, employee_id, phone
         FROM staff
         ${search ? `WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR employee_id ILIKE $1` : ''}
         ORDER BY first_name
         LIMIT 40`,
        search ? [`%${search}%`] : []
      );
      return NextResponse.json({ success: true, data: fallback.rows });
    }
    } catch {
      const result = await auth.db.query(
        `SELECT s.id, s.first_name, s.last_name, s.employee_id, s.phone
         FROM staff s
         ${where}
         ORDER BY s.first_name, s.last_name
         LIMIT 40`,
        params
      );
      return NextResponse.json({ success: true, data: result.rows });
    }
  } catch (error) {
    console.error('Library staff list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load staff' }, { status: 500 });
  }
}
