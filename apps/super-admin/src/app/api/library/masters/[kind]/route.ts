import { NextRequest, NextResponse } from 'next/server';
import { requireLibrary } from '@/lib/library-utils';

const TABLES: Record<string, string> = {
  authors: 'library_authors',
  publishers: 'library_publishers',
  subjects: 'library_subjects',
};

function tableFor(kind: string) {
  return TABLES[kind] || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { kind: string } }
) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const table = tableFor(params.kind);
    if (!table) {
      return NextResponse.json({ success: false, error: 'Unknown master' }, { status: 404 });
    }
    const result = await auth.db.query(`SELECT * FROM ${table} ORDER BY name`);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Library master list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load master' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { kind: string } }
) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const table = tableFor(params.kind);
    if (!table) {
      return NextResponse.json({ success: false, error: 'Unknown master' }, { status: 404 });
    }
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    const result = await auth.db.query(
      `INSERT INTO ${table} (name, remarks, is_active) VALUES ($1, $2, $3) RETURNING *`,
      [name, body.remarks ? String(body.remarks).trim() : null, body.is_active !== false]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Library master create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { kind: string } }
) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const table = tableFor(params.kind);
    if (!table) {
      return NextResponse.json({ success: false, error: 'Unknown master' }, { status: 404 });
    }
    const body = await request.json();
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    const result = await auth.db.query(
      `UPDATE ${table}
       SET name = COALESCE($1, name),
           remarks = COALESCE($2, remarks),
           is_active = COALESCE($3, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [
        body.name != null ? String(body.name).trim() : null,
        body.remarks != null ? String(body.remarks) : null,
        body.is_active == null ? null : Boolean(body.is_active),
        id,
      ]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Library master update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { kind: string } }
) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const table = tableFor(params.kind);
    if (!table) {
      return NextResponse.json({ success: false, error: 'Unknown master' }, { status: 404 });
    }
    const id = Number(request.nextUrl.searchParams.get('id') || '');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    await auth.db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Library master delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
