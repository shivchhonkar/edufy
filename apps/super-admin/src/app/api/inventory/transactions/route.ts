import { NextRequest, NextResponse } from 'next/server';
import { requireInventory } from '@/lib/inventory-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInventory(request);
    if (auth instanceof NextResponse) return auth;
    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get('item_id');
    const transactionType = searchParams.get('transaction_type');

    const cond = ['1=1'];
    const params: unknown[] = [];
    if (itemId) {
      params.push(itemId);
      cond.push(`t.item_id = $${params.length}`);
    }
    if (transactionType) {
      params.push(transactionType);
      cond.push(`t.transaction_type = $${params.length}`);
    }

    const result = await auth.db.query(
      `SELECT t.*, i.item_name, i.item_code, i.size
       FROM inventory_transactions t
       JOIN inventory_items i ON t.item_id = i.id
       WHERE ${cond.join(' AND ')}
       ORDER BY t.created_at DESC LIMIT 100`,
      params
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch inventory transactions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireInventory(request, true);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const { item_id, transaction_type, quantity, transaction_date, issued_to_type, issued_to_id, unit_price, remarks } = body;
    if (!item_id || !transaction_type || !quantity || !transaction_date) {
      return NextResponse.json({ success: false, error: 'Required fields are missing' }, { status: 400 });
    }

    const result = await auth.db.transaction(async (client) => {
      const itemResult = await client.query(
        'SELECT quantity, unit_price FROM inventory_items WHERE id = $1',
        [item_id]
      );
      if (itemResult.rows.length === 0) throw new Error('Item not found');
      const currentQuantity = itemResult.rows[0].quantity;
      const itemUnitPrice = unit_price || itemResult.rows[0].unit_price || 0;
      let newQuantity = currentQuantity;
      if (transaction_type === 'purchase' || transaction_type === 'return') {
        newQuantity = currentQuantity + quantity;
      } else if (transaction_type === 'issue' || transaction_type === 'damage') {
        newQuantity = currentQuantity - quantity;
        if (newQuantity < 0) throw new Error('Insufficient quantity');
      } else if (transaction_type === 'adjustment') {
        newQuantity = quantity;
      }
      await client.query(
        'UPDATE inventory_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newQuantity, item_id]
      );
      const total_amount = quantity * itemUnitPrice;
      const transactionResult = await client.query(
        `INSERT INTO inventory_transactions (
          item_id, transaction_type, quantity, transaction_date,
          issued_to_type, issued_to_id, unit_price, total_amount, remarks, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          item_id,
          transaction_type,
          quantity,
          transaction_date,
          issued_to_type,
          issued_to_id,
          itemUnitPrice,
          total_amount,
          remarks,
          auth.user.id,
        ]
      );
      return transactionResult.rows[0];
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record inventory transaction';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
