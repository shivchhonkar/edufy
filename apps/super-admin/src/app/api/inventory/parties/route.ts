import { NextRequest, NextResponse } from 'next/server';
import { requireInventory } from '@/lib/inventory-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInventory(request);
    if (auth instanceof NextResponse) return auth;
    const type = request.nextUrl.searchParams.get('type') || 'student';
    const q = request.nextUrl.searchParams.get('q')?.trim() || '';
    if (q.length < 1) return NextResponse.json({ success: true, data: [] });
    const like = `%${q}%`;

    if (type === 'staff') {
      const result = await auth.db.query(
        `SELECT id, TRIM(BOTH ' ' FROM COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) AS name,
                employee_id AS code
         FROM staff
         WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR employee_id ILIKE $1)
         ORDER BY first_name
         LIMIT 20`,
        [like]
      );
      return NextResponse.json({ success: true, data: result.rows });
    }
    if (type === 'department') {
      try {
        const result = await auth.db.query(
          `SELECT id, name, NULL AS code FROM departments WHERE name ILIKE $1 ORDER BY name LIMIT 20`,
          [like]
        );
        return NextResponse.json({ success: true, data: result.rows });
      } catch {
        return NextResponse.json({ success: true, data: [] });
      }
    }
    const result = await auth.db.query(
      `SELECT id, TRIM(BOTH ' ' FROM COALESCE(first_name,'') || ' ' || COALESCE(last_name,'')) AS name,
              admission_number AS code
       FROM students
       WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR admission_number ILIKE $1)
       ORDER BY first_name
       LIMIT 20`,
      [like]
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to search' }, { status: 500 });
  }
}
