import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureHousesSchema } from '@/lib/ensure-houses-schema';

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureHousesSchema(db);

    const activeOnly = request.nextUrl.searchParams.get('active_only') === 'true';

    let query = `
      SELECT h.*,
        COUNT(e.id) FILTER (WHERE e.is_current = true)::int AS student_count
      FROM school_houses h
      LEFT JOIN student_enrollments e ON e.house_id = h.id
    `;
    const params: unknown[] = [];

    if (activeOnly) {
      query += ' WHERE h.is_active = true';
    }

    query += ' GROUP BY h.id ORDER BY h.sort_order ASC, h.name ASC';

    const result = await db.query(query, params);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching houses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch houses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureHousesSchema(db);

    const body = await request.json();
    const name = String(body.name || '').trim();
    const code = body.code ? String(body.code).trim() : null;
    const color = String(body.color || '#2563eb').trim();
    const description = body.description ? String(body.description).trim() : null;
    const sortOrder = parseInt(String(body.sort_order ?? 0), 10) || 0;
    const isActive = body.is_active !== false;

    if (!name) {
      return NextResponse.json({ success: false, error: 'House name is required' }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO school_houses (name, code, color, description, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, code, color, description, sortOrder, isActive]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: unknown) {
    const pgCode = (error as { code?: string })?.code;
    if (pgCode === '23505') {
      return NextResponse.json(
        { success: false, error: 'A house with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Error creating house:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create house' },
      { status: 500 }
    );
  }
}
