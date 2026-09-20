import { NextRequest, NextResponse } from 'next/server';
import { defaultLocationId, requireInventory, writeAudit } from '@/lib/inventory-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInventory(request);
    if (auth instanceof NextResponse) return auth;
    const status = request.nextUrl.searchParams.get('status');
    const cond = ['1=1'];
    const params: unknown[] = [];
    if (status) {
      params.push(status);
      cond.push(`a.status = $${params.length}`);
    }
    const result = await auth.db.query(
      `SELECT a.*, i.item_name, i.size, l.name AS location_name,
              (SELECT party_name FROM inventory_asset_assignments x
               WHERE x.asset_id = a.id AND x.returned_at IS NULL
               ORDER BY x.id DESC LIMIT 1) AS assigned_to
       FROM inventory_assets a
       LEFT JOIN inventory_items i ON i.id = a.item_id
       LEFT JOIN inventory_locations l ON l.id = a.location_id
       WHERE ${cond.join(' AND ')}
       ORDER BY a.created_at DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to load assets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireInventory(request, true);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const tag = String(body.asset_tag || '').trim();
    if (!tag) return NextResponse.json({ success: false, error: 'Asset tag is required' }, { status: 400 });
    const locationId = body.location_id || (await defaultLocationId(auth.db));
    const result = await auth.db.query(
      `INSERT INTO inventory_assets (item_id, asset_tag, serial_no, status, location_id, purchase_date, purchase_value, remarks)
       VALUES ($1,$2,$3,'in_store',$4,$5,$6,$7) RETURNING *`,
      [
        body.item_id || null,
        tag,
        body.serial_no || null,
        locationId,
        body.purchase_date || null,
        body.purchase_value || 0,
        body.remarks || null,
      ]
    );
    await writeAudit(auth.db, auth.user, 'create', 'asset', result.rows[0].id, { tag });
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to create asset' }, { status: 500 });
  }
}
