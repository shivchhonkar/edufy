import { NextRequest, NextResponse } from 'next/server';
import { requireInventory, writeAudit } from '@/lib/inventory-utils';

const TABLES: Record<string, { table: string; extra?: string[] }> = {
  categories: { table: 'inventory_categories', extra: ['description'] },
  units: { table: 'inventory_units', extra: ['remarks'] },
  vendors: { table: 'inventory_vendors', extra: ['contact_person', 'phone', 'email', 'address', 'gstin'] },
  locations: { table: 'inventory_locations', extra: ['remarks'] },
};

export async function GET(request: NextRequest, { params }: { params: { kind: string } }) {
  try {
    const auth = await requireInventory(request);
    if (auth instanceof NextResponse) return auth;
    const meta = TABLES[params.kind];
    if (!meta) return NextResponse.json({ success: false, error: 'Unknown master' }, { status: 404 });
    const result = await auth.db.query(`SELECT * FROM ${meta.table} ORDER BY name`);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to load master' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { kind: string } }) {
  try {
    const auth = await requireInventory(request, true);
    if (auth instanceof NextResponse) return auth;
    const meta = TABLES[params.kind];
    if (!meta) return NextResponse.json({ success: false, error: 'Unknown master' }, { status: 404 });
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    const extraCols = meta.extra || [];
    const extraVals = extraCols.map((col) => (body[col] != null && body[col] !== '' ? String(body[col]) : null));
    const placeholders = extraCols.map((_, i) => `$${i + 2}`).join(', ');
    const result = await auth.db.query(
      `INSERT INTO ${meta.table} (name${extraCols.length ? ', ' + extraCols.join(', ') : ''})
       VALUES ($1${placeholders ? ', ' + placeholders : ''}) RETURNING *`,
      [name, ...extraVals]
    );
    await writeAudit(auth.db, auth.user, 'create', params.kind, result.rows[0].id, { name });
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to create' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { kind: string } }) {
  try {
    const auth = await requireInventory(request, true);
    if (auth instanceof NextResponse) return auth;
    const meta = TABLES[params.kind];
    if (!meta) return NextResponse.json({ success: false, error: 'Unknown master' }, { status: 404 });
    const body = await request.json();
    const id = Number(body.id);
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    const name = String(body.name || '').trim();
    const extraCols = meta.extra || [];
    const sets = ['name = $1'];
    const vals: unknown[] = [name];
    extraCols.forEach((col) => {
      vals.push(body[col] != null && body[col] !== '' ? String(body[col]) : null);
      sets.push(`${col} = $${vals.length}`);
    });
    if (body.is_active != null) {
      vals.push(Boolean(body.is_active));
      sets.push(`is_active = $${vals.length}`);
    }
    vals.push(id);
    const result = await auth.db.query(
      `UPDATE ${meta.table} SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (!result.rows[0]) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    await writeAudit(auth.db, auth.user, 'update', params.kind, id, { name });
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { kind: string } }) {
  try {
    const auth = await requireInventory(request, true);
    if (auth instanceof NextResponse) return auth;
    const meta = TABLES[params.kind];
    if (!meta) return NextResponse.json({ success: false, error: 'Unknown master' }, { status: 404 });
    const id = Number(request.nextUrl.searchParams.get('id'));
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    await auth.db.query(`DELETE FROM ${meta.table} WHERE id = $1`, [id]);
    await writeAudit(auth.db, auth.user, 'delete', params.kind, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
