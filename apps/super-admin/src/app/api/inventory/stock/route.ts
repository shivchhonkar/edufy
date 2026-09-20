import { NextRequest, NextResponse } from 'next/server';
import { requireInventory } from '@/lib/inventory-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInventory(request);
    if (auth instanceof NextResponse) return auth;
    const type = request.nextUrl.searchParams.get('type') || 'current';
    const itemId = request.nextUrl.searchParams.get('item_id');
    const locationId = request.nextUrl.searchParams.get('location_id');

    if (type === 'low') {
      const result = await auth.db.query(
        `SELECT i.*, c.name AS category_name
         FROM inventory_items i
         LEFT JOIN inventory_categories c ON c.id = i.category_id
         WHERE i.quantity <= COALESCE(NULLIF(i.min_stock_level, 0), 0)
         ORDER BY i.quantity ASC, i.item_name`
      );
      return NextResponse.json({ success: true, data: result.rows });
    }

    if (type === 'ledger') {
      const cond = ['1=1'];
      const params: unknown[] = [];
      if (itemId) {
        params.push(Number(itemId));
        cond.push(`t.item_id = $${params.length}`);
      }
      if (locationId) {
        params.push(Number(locationId));
        cond.push(`t.location_id = $${params.length}`);
      }
      const result = await auth.db.query(
        `SELECT t.*, i.item_name, i.item_code, i.size, i.unit, l.name AS location_name
         FROM inventory_transactions t
         JOIN inventory_items i ON i.id = t.item_id
         LEFT JOIN inventory_locations l ON l.id = t.location_id
         WHERE ${cond.join(' AND ')}
         ORDER BY t.created_at DESC, t.id DESC
         LIMIT 500`,
        params
      );
      return NextResponse.json({ success: true, data: result.rows });
    }

    const cond = ['1=1'];
    const params: unknown[] = [];
    if (locationId) {
      params.push(Number(locationId));
      cond.push(`s.location_id = $${params.length}`);
    }
    const result = await auth.db.query(
      `SELECT i.id, i.item_name, i.item_code, i.size, i.unit, i.min_stock_level, i.unit_price, i.barcode,
              c.name AS category_name,
              COALESCE(SUM(s.quantity), i.quantity, 0) AS quantity,
              json_agg(json_build_object('location_id', l.id, 'location', l.name, 'quantity', s.quantity)
                ORDER BY l.name) FILTER (WHERE l.id IS NOT NULL) AS locations
       FROM inventory_items i
       LEFT JOIN inventory_categories c ON c.id = i.category_id
       LEFT JOIN inventory_stock s ON s.item_id = i.id
       LEFT JOIN inventory_locations l ON l.id = s.location_id
       WHERE ${cond.join(' AND ')}
       GROUP BY i.id, c.name
       ORDER BY i.item_name`,
      params
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to load stock' }, { status: 500 });
  }
}
