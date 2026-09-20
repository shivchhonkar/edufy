import { NextRequest, NextResponse } from 'next/server';
import {
  defaultLocationId,
  nextDocNo,
  requireInventory,
  writeAudit,
  type InventoryKind,
} from '@/lib/inventory-utils';

const VALID_KINDS = new Set<InventoryKind>([
  'pr',
  'po',
  'grn',
  'in',
  'out',
  'issue',
  'sale',
  'return',
  'transfer',
  'adjustment',
  'count',
]);

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInventory(request);
    if (auth instanceof NextResponse) return auth;
    const kind = request.nextUrl.searchParams.get('kind');
    const cond = ['1=1'];
    const params: unknown[] = [];
    if (kind) {
      params.push(kind);
      cond.push(`d.kind = $${params.length}`);
    }
    const result = await auth.db.query(
      `SELECT d.*,
              v.name AS vendor_name,
              loc.name AS location_name,
              tloc.name AS to_location_name
       FROM inventory_docs d
       LEFT JOIN inventory_vendors v ON v.id = d.vendor_id
       LEFT JOIN inventory_locations loc ON loc.id = d.location_id
       LEFT JOIN inventory_locations tloc ON tloc.id = d.to_location_id
       WHERE ${cond.join(' AND ')}
       ORDER BY d.doc_date DESC, d.id DESC
       LIMIT 200`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to load documents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireInventory(request, true);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const kind = String(body.kind || '') as InventoryKind;
    if (!VALID_KINDS.has(kind)) {
      return NextResponse.json({ success: false, error: 'Invalid document kind' }, { status: 400 });
    }
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const validLines = lines
      .map((line: Record<string, unknown>) => ({
        item_id: Number(line.item_id),
        quantity: Number(line.quantity || 0),
        unit_price: Number(line.unit_price || 0),
        counted_qty: line.counted_qty === undefined || line.counted_qty === null || line.counted_qty === ''
          ? null
          : Number(line.counted_qty),
        remarks: line.remarks ? String(line.remarks) : null,
      }))
      .filter((line) => line.item_id && (kind === 'count' || line.quantity > 0 || line.counted_qty !== null));
    if (!validLines.length) {
      return NextResponse.json({ success: false, error: 'Add at least one item' }, { status: 400 });
    }

    const created = await auth.db.transaction(async (client) => {
      const locationId =
        body.location_id != null && body.location_id !== ''
          ? Number(body.location_id)
          : await defaultLocationId(client);
      if (kind !== 'pr' && kind !== 'po' && !locationId) {
        throw new Error('Store location is required');
      }
      const docNo = await nextDocNo(client, kind);
      const docRes = await client.query(
        `INSERT INTO inventory_docs (
           kind, doc_no, doc_date, status, vendor_id, location_id, to_location_id,
           party_type, party_id, party_name, remarks, created_by
         ) VALUES ($1,$2,COALESCE($3::date, CURRENT_DATE),'draft',$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          kind,
          docNo,
          body.doc_date || null,
          body.vendor_id || null,
          locationId,
          body.to_location_id || null,
          body.party_type || null,
          body.party_id || null,
          body.party_name ? String(body.party_name).trim() : null,
          body.remarks || null,
          auth.user.id,
        ]
      );
      const doc = docRes.rows[0];
      for (const line of validLines) {
        await client.query(
          `INSERT INTO inventory_doc_lines (doc_id, item_id, quantity, counted_qty, unit_price, remarks)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [doc.id, line.item_id, line.quantity, line.counted_qty, line.unit_price, line.remarks]
        );
      }
      return doc;
    });

    await writeAudit(auth.db, auth.user, 'create', 'document', created.id, {
      kind,
      doc_no: created.doc_no,
      lines: validLines.length,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Failed to create document';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
