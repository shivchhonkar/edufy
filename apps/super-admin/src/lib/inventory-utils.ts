import { NextRequest, NextResponse } from 'next/server';
import { hasRole } from '@edulakhya/auth';
import { getAuthenticatedDb } from '@/lib/request-db';
import { ensureInventorySchema } from '@/lib/ensure-inventory-schema';
import type { AuthUser } from '@/lib/api-auth';
import type { RequestDb } from '@/lib/request-db';
import type { PoolClient } from 'pg';

export const INVENTORY_ROLES = ['super_admin', 'admin', 'inventory_manager'];
export const INVENTORY_WRITE_ROLES = ['super_admin', 'admin', 'inventory_manager'];

export type InventoryKind =
  | 'pr'
  | 'po'
  | 'grn'
  | 'in'
  | 'out'
  | 'issue'
  | 'sale'
  | 'return'
  | 'transfer'
  | 'adjustment'
  | 'count';

const KIND_PREFIX: Record<InventoryKind, string> = {
  pr: 'PR',
  po: 'PO',
  grn: 'GRN',
  in: 'IN',
  out: 'OUT',
  issue: 'ISS',
  sale: 'SAL',
  return: 'RET',
  transfer: 'TRF',
  adjustment: 'ADJ',
  count: 'CNT',
};

export async function requireInventory(request: NextRequest, write = false) {
  const auth = await getAuthenticatedDb(request);
  if (auth instanceof NextResponse) return auth;
  const roles = write ? INVENTORY_WRITE_ROLES : INVENTORY_ROLES;
  if (!hasRole(auth.user.role || '', roles)) {
    return NextResponse.json({ success: false, error: 'Inventory access required' }, { status: 403 });
  }
  await ensureInventorySchema(auth.db);
  return auth;
}

export async function writeAudit(
  db: RequestDb | PoolClient,
  user: AuthUser,
  action: string,
  entity: string,
  entityId?: number | null,
  details?: unknown
) {
  const named = user as { name?: string; email?: string; first_name?: string; last_name?: string };
  const userName =
    named.name ||
    [named.first_name, named.last_name].filter(Boolean).join(' ') ||
    named.email ||
    String(user.id);
  await db.query(
    `INSERT INTO inventory_audit_log (user_id, user_name, action, entity, entity_id, details)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [user.id, userName, action, entity, entityId || null, details ? JSON.stringify(details) : null]
  );
}

export async function nextDocNo(db: RequestDb | PoolClient, kind: InventoryKind) {
  const prefix = KIND_PREFIX[kind];
  const year = new Date().getFullYear();
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM inventory_docs
     WHERE kind = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
    [kind, year]
  );
  const n = parseInt(result.rows[0]?.count || '0', 10) + 1;
  return `${prefix}-${year}-${String(n).padStart(4, '0')}`;
}

export async function defaultLocationId(db: RequestDb | PoolClient) {
  const result = await db.query<{ id: number }>(
    `SELECT id FROM inventory_locations WHERE is_active = true ORDER BY id LIMIT 1`
  );
  return result.rows[0]?.id || null;
}

async function stockQty(client: PoolClient, itemId: number, locationId: number) {
  const result = await client.query<{ quantity: string }>(
    `SELECT quantity::text AS quantity FROM inventory_stock WHERE item_id = $1 AND location_id = $2`,
    [itemId, locationId]
  );
  return parseInt(result.rows[0]?.quantity || '0', 10);
}

async function refreshItemQty(client: PoolClient, itemId: number) {
  await client.query(
    `UPDATE inventory_items
     SET quantity = COALESCE((SELECT SUM(quantity) FROM inventory_stock WHERE item_id = $1), 0),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [itemId]
  );
}

export async function applyStockDelta(
  client: PoolClient,
  params: {
    itemId: number;
    locationId: number;
    delta: number;
    type: string;
    userId?: number;
    remarks?: string | null;
    referenceType?: string;
    referenceId?: number;
    partyType?: string | null;
    partyId?: number | null;
    partyName?: string | null;
    unitPrice?: number | null;
    toLocationId?: number | null;
    date?: string | null;
  }
) {
  if (!params.delta) return;
  const before = await stockQty(client, params.itemId, params.locationId);
  const after = before + params.delta;
  if (after < 0) {
    throw new Error('Insufficient stock');
  }
  await client.query(
    `INSERT INTO inventory_stock (item_id, location_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (item_id, location_id)
     DO UPDATE SET quantity = EXCLUDED.quantity`,
    [params.itemId, params.locationId, after]
  );
  await refreshItemQty(client, params.itemId);
  await client.query(
    `INSERT INTO inventory_transactions (
       item_id, transaction_type, quantity, unit_price, reference_type, reference_id,
       remarks, created_by, transaction_date, issued_to_type, issued_to_id, issued_to_name,
       total_amount, location_id, to_location_id, qty_before, qty_after
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9, CURRENT_DATE),$10,$11,$12,$13,$14,$15,$16,$17)`,
    [
      params.itemId,
      params.type,
      Math.abs(params.delta),
      params.unitPrice || 0,
      params.referenceType || null,
      params.referenceId || null,
      params.remarks || null,
      params.userId || null,
      params.date || null,
      params.partyType || null,
      params.partyId || null,
      params.partyName || null,
      Math.abs(params.delta) * Number(params.unitPrice || 0),
      params.locationId,
      params.toLocationId || null,
      before,
      after,
    ]
  );
}

export async function postDocument(client: PoolClient, docId: number, userId: number) {
  const docRes = await client.query(
    `SELECT * FROM inventory_docs WHERE id = $1 FOR UPDATE`,
    [docId]
  );
  const doc = docRes.rows[0];
  if (!doc) throw new Error('Document not found');
  if (doc.status === 'posted') throw new Error('Already posted');
  if (doc.status === 'cancelled') throw new Error('Cancelled documents cannot be posted');

  const linesRes = await client.query(`SELECT * FROM inventory_doc_lines WHERE doc_id = $1`, [docId]);
  const lines = linesRes.rows;
  if (!lines.length) throw new Error('Add at least one item');

  const kind = doc.kind as InventoryKind;
  const locationId = doc.location_id;
  if (kind !== 'pr' && kind !== 'po' && !locationId) {
    throw new Error('Store location is required');
  }

  for (const line of lines) {
    const qty = Number(line.quantity || 0);
    const price = Number(line.unit_price || 0);
    const base = {
      itemId: Number(line.item_id),
      locationId: Number(locationId),
      userId,
      remarks: doc.remarks || line.remarks,
      referenceType: kind,
      referenceId: docId,
      partyType: doc.party_type,
      partyId: doc.party_id,
      partyName: doc.party_name,
      unitPrice: price,
      date: doc.doc_date,
    };

    if (kind === 'pr' || kind === 'po') {
      continue;
    }
    if (kind === 'grn' || kind === 'in' || kind === 'return') {
      await applyStockDelta(client, { ...base, delta: qty, type: kind });
    } else if (kind === 'out' || kind === 'issue' || kind === 'sale') {
      await applyStockDelta(client, { ...base, delta: -qty, type: kind });
    } else if (kind === 'transfer') {
      if (!doc.to_location_id) throw new Error('Destination store is required');
      await applyStockDelta(client, { ...base, delta: -qty, type: 'transfer', toLocationId: doc.to_location_id });
      await applyStockDelta(client, {
        ...base,
        locationId: Number(doc.to_location_id),
        delta: qty,
        type: 'transfer',
        toLocationId: doc.to_location_id,
      });
    } else if (kind === 'adjustment') {
      await applyStockDelta(client, { ...base, delta: qty, type: 'adjustment' });
    } else if (kind === 'count') {
      const counted = Number(line.counted_qty ?? line.quantity ?? 0);
      const current = await stockQty(client, Number(line.item_id), Number(locationId));
      const delta = counted - current;
      if (delta !== 0) {
        await applyStockDelta(client, { ...base, delta, type: 'adjustment' });
      }
    }
  }

  await client.query(
    `UPDATE inventory_docs
     SET status = 'posted', posted_by = $2, posted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [docId, userId]
  );
}
