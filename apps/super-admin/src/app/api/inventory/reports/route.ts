import { NextRequest, NextResponse } from 'next/server';
import { requireInventory } from '@/lib/inventory-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInventory(request);
    if (auth instanceof NextResponse) return auth;
    const type = request.nextUrl.searchParams.get('type') || 'summary';
    const fromDate = request.nextUrl.searchParams.get('from_date');
    const toDate = request.nextUrl.searchParams.get('to_date');

    if (type === 'movement') {
      const cond = ['1=1'];
      const params: unknown[] = [];
      if (fromDate) {
        params.push(fromDate);
        cond.push(`COALESCE(t.transaction_date, t.created_at::date) >= $${params.length}`);
      }
      if (toDate) {
        params.push(toDate);
        cond.push(`COALESCE(t.transaction_date, t.created_at::date) <= $${params.length}`);
      }
      const result = await auth.db.query(
        `SELECT t.transaction_type, COUNT(*)::int AS entries, SUM(t.quantity)::int AS quantity
         FROM inventory_transactions t
         WHERE ${cond.join(' AND ')}
         GROUP BY t.transaction_type
         ORDER BY t.transaction_type`,
        params
      );
      return NextResponse.json({ success: true, data: result.rows });
    }

    if (type === 'issue') {
      const result = await auth.db.query(
        `SELECT d.doc_no, d.doc_date, d.party_type, d.party_name, i.item_name, i.size, l.quantity, l.unit_price
         FROM inventory_docs d
         JOIN inventory_doc_lines l ON l.doc_id = d.id
         JOIN inventory_items i ON i.id = l.item_id
         WHERE d.kind IN ('issue','sale') AND d.status = 'posted'
         ORDER BY d.doc_date DESC, d.id DESC
         LIMIT 300`
      );
      return NextResponse.json({ success: true, data: result.rows });
    }

    const [items, low, value] = await Promise.all([
      auth.db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM inventory_items`),
      auth.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM inventory_items WHERE quantity <= COALESCE(min_stock_level, 0)`
      ),
      auth.db.query<{ value: string }>(
        `SELECT COALESCE(SUM(quantity * COALESCE(unit_price,0)),0)::text AS value FROM inventory_items`
      ),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        totalItems: parseInt(items.rows[0]?.count || '0', 10),
        lowStock: parseInt(low.rows[0]?.count || '0', 10),
        stockValue: Number(value.rows[0]?.value || 0),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to load report' }, { status: 500 });
  }
}
