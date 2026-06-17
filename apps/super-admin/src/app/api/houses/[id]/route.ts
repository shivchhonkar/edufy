import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureHousesSchema } from '@/lib/ensure-houses-schema';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureHousesSchema(db);

    const id = parseInt(params.id, 10);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const result = await db.query(
      `SELECT h.*,
        COUNT(e.id) FILTER (WHERE e.is_current = true)::int AS student_count
       FROM school_houses h
       LEFT JOIN student_enrollments e ON e.house_id = h.id
       WHERE h.id = $1
       GROUP BY h.id`,
      [id]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'House not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching house:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch house' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureHousesSchema(db);

    const id = parseInt(params.id, 10);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const body = await request.json();
    const name = body.name !== undefined ? String(body.name).trim() : undefined;
    const code = body.code !== undefined ? (body.code ? String(body.code).trim() : null) : undefined;
    const color = body.color !== undefined ? String(body.color).trim() : undefined;
    const description =
      body.description !== undefined
        ? body.description
          ? String(body.description).trim()
          : null
        : undefined;
    const sortOrder =
      body.sort_order !== undefined ? parseInt(String(body.sort_order), 10) || 0 : undefined;
    const isActive = body.is_active !== undefined ? Boolean(body.is_active) : undefined;

    if (name !== undefined && !name) {
      return NextResponse.json({ success: false, error: 'House name cannot be empty' }, { status: 400 });
    }

    const result = await db.query(
      `UPDATE school_houses SET
        name = COALESCE($2, name),
        code = CASE WHEN $3::boolean THEN $4 ELSE code END,
        color = COALESCE($5, color),
        description = CASE WHEN $6::boolean THEN $7 ELSE description END,
        sort_order = COALESCE($8, sort_order),
        is_active = COALESCE($9, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [
        id,
        name ?? null,
        code !== undefined,
        code ?? null,
        color ?? null,
        description !== undefined,
        description ?? null,
        sortOrder ?? null,
        isActive ?? null,
      ]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'House not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: unknown) {
    const pgCode = (error as { code?: string })?.code;
    if (pgCode === '23505') {
      return NextResponse.json(
        { success: false, error: 'A house with this name already exists' },
        { status: 409 }
      );
    }
    console.error('Error updating house:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update house' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    await ensureHousesSchema(db);

    const id = parseInt(params.id, 10);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }

    const result = await db.query('DELETE FROM school_houses WHERE id = $1 RETURNING id', [id]);

    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'House not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    console.error('Error deleting house:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete house' },
      { status: 500 }
    );
  }
}
