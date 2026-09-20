import { NextRequest, NextResponse } from 'next/server';
import { requireInventory, writeAudit } from '@/lib/inventory-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInventory(request);
    if (auth instanceof NextResponse) return auth;
    const assetId = request.nextUrl.searchParams.get('asset_id');
    const cond = ['1=1'];
    const params: unknown[] = [];
    if (assetId) {
      params.push(Number(assetId));
      cond.push(`x.asset_id = $${params.length}`);
    }
    const result = await auth.db.query(
      `SELECT x.*, a.asset_tag, i.item_name
       FROM inventory_asset_assignments x
       JOIN inventory_assets a ON a.id = x.asset_id
       LEFT JOIN inventory_items i ON i.id = a.item_id
       WHERE ${cond.join(' AND ')}
       ORDER BY x.assigned_at DESC, x.id DESC`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to load assignments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireInventory(request, true);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const assetId = Number(body.asset_id);
    const partyName = String(body.party_name || '').trim();
    if (!assetId || !partyName) {
      return NextResponse.json({ success: false, error: 'Asset and assignee are required' }, { status: 400 });
    }
    const result = await auth.db.transaction(async (client) => {
      await client.query(
        `UPDATE inventory_asset_assignments SET returned_at = CURRENT_DATE
         WHERE asset_id = $1 AND returned_at IS NULL`,
        [assetId]
      );
      const inserted = await client.query(
        `INSERT INTO inventory_asset_assignments (asset_id, party_type, party_id, party_name, assigned_at, remarks, created_by)
         VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE),$6,$7) RETURNING *`,
        [
          assetId,
          body.party_type || 'staff',
          body.party_id || null,
          partyName,
          body.assigned_at || null,
          body.remarks || null,
          auth.user.id,
        ]
      );
      await client.query(`UPDATE inventory_assets SET status = 'assigned' WHERE id = $1`, [assetId]);
      return inserted.rows[0];
    });
    await writeAudit(auth.db, auth.user, 'assign', 'asset', assetId, { partyName });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to assign asset' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireInventory(request, true);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const id = Number(body.id);
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    const updated = await auth.db.transaction(async (client) => {
      const row = await client.query(
        `UPDATE inventory_asset_assignments SET returned_at = COALESCE($2, CURRENT_DATE)
         WHERE id = $1 RETURNING *`,
        [id, body.returned_at || null]
      );
      const assignment = row.rows[0];
      if (assignment) {
        await client.query(`UPDATE inventory_assets SET status = 'in_store' WHERE id = $1`, [assignment.asset_id]);
      }
      return assignment;
    });
    await writeAudit(auth.db, auth.user, 'return', 'asset', updated?.asset_id, { id });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to return asset' }, { status: 500 });
  }
}
