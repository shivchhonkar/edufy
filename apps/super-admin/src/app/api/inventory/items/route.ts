import { NextRequest, NextResponse } from 'next/server';
import { defaultLocationId, requireInventory, writeAudit } from '@/lib/inventory-utils';
import type { PoolClient } from 'pg';

function sizeCode(size?: string | null) {
  const key = String(size || '').trim();
  const map: Record<string, string> = {
    Small: 'S',
    Medium: 'M',
    Large: 'L',
    XL: 'XL',
    XXL: 'XXL',
  };
  return map[key] || key.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase();
}

async function insertItem(
  client: PoolClient,
  body: Record<string, unknown>,
  options: { name: string; code: string; qty: number; price: number; size?: string | null }
) {
  const inserted = await client.query(
    `INSERT INTO inventory_items (
       category_id, item_name, item_code, description, unit, quantity, min_stock_level,
       unit_price, gst_percentage, hsn_code, vendor_id, unit_id, barcode, is_asset,
       reorder_qty, location, is_active, size
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true,$17)
     RETURNING *`,
    [
      body.category_id || null,
      options.name,
      options.code,
      body.description || null,
      body.unit || 'pcs',
      options.qty,
      body.min_stock_level || 0,
      options.price,
      body.gst_percentage || 0,
      body.hsn_code || null,
      body.vendor_id || null,
      body.unit_id || null,
      options.size ? `${options.code}` : body.barcode || options.code,
      Boolean(body.is_asset),
      body.reorder_qty || null,
      body.location || null,
      options.size || null,
    ]
  );
  const item = inserted.rows[0];
  const locationId = Number(body.location_id) || (await defaultLocationId(client));
  if (locationId) {
    await client.query(
      `INSERT INTO inventory_stock (item_id, location_id, quantity) VALUES ($1,$2,$3)
       ON CONFLICT (item_id, location_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
      [item.id, locationId, options.qty]
    );
  }
  return item;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInventory(request);
    if (auth instanceof NextResponse) return auth;
    const q = request.nextUrl.searchParams;
    const categoryId = q.get('category_id');
    const lowStock = q.get('low_stock');
    const search = q.get('search')?.trim();
    const cond: string[] = ['1=1'];
    const params: unknown[] = [];
    if (categoryId) {
      params.push(Number(categoryId));
      cond.push(`i.category_id = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      cond.push(
        `(i.item_name ILIKE $${params.length} OR i.item_code ILIKE $${params.length} OR i.barcode ILIKE $${params.length} OR i.size ILIKE $${params.length})`
      );
    }
    if (lowStock === 'true') {
      cond.push(`i.quantity <= COALESCE(i.min_stock_level, 0)`);
    }
    const result = await auth.db.query(
      `SELECT i.*, c.name AS category_name, u.name AS unit_name, v.name AS vendor_name
       FROM inventory_items i
       LEFT JOIN inventory_categories c ON c.id = i.category_id
       LEFT JOIN inventory_units u ON u.id = i.unit_id
       LEFT JOIN inventory_vendors v ON v.id = i.vendor_id
       WHERE ${cond.join(' AND ')}
       ORDER BY i.item_name, i.size NULLS FIRST, i.id`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to load items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireInventory(request, true);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const name = String(body.item_name || '').trim();
    if (!name) return NextResponse.json({ success: false, error: 'Item name is required' }, { status: 400 });
    const baseCode = String(body.item_code || '').trim();
    const sizes = Array.isArray(body.sizes) ? body.sizes : [];
    const created = await auth.db.transaction(async (client) => {
      if (sizes.length) {
        const rows = [];
        for (const raw of sizes) {
          const size = String(raw.size || '').trim();
          if (!size) continue;
          const suffix = sizeCode(size);
          const code = baseCode ? `${baseCode}-${suffix}` : `ITM${Date.now().toString().slice(-6)}${suffix}`;
          const qty = Math.max(0, parseInt(String(raw.quantity || 0), 10) || 0);
          const price = Number(raw.unit_price || body.unit_price || 0);
          rows.push(
            await insertItem(client, body, { name, code, qty, price, size })
          );
        }
        if (!rows.length) throw new Error('Select at least one size');
        return rows;
      }
      const code = baseCode || `ITM${Date.now().toString().slice(-8)}`;
      const qty = Math.max(0, parseInt(String(body.quantity || 0), 10) || 0);
      const item = await insertItem(client, body, {
        name,
        code,
        qty,
        price: Number(body.unit_price || 0),
        size: body.size ? String(body.size) : null,
      });
      return [item];
    });
    await writeAudit(auth.db, auth.user, 'create', 'item', created[0]?.id, {
      name,
      sizes: created.map((row) => row.size).filter(Boolean),
    });
    return NextResponse.json({ success: true, data: created.length === 1 ? created[0] : created }, { status: 201 });
  } catch (error) {
    const pgCode = typeof error === 'object' && error && 'code' in error ? String((error as { code?: string }).code) : '';
    const message =
      pgCode === '23505'
        ? 'An item with this code already exists. Use a different item code, or add only the missing sizes.'
        : error instanceof Error
          ? error.message
          : 'Failed to create item';
    console.error(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
