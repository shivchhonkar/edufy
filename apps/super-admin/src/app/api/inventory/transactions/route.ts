import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { InventoryTransaction } from '@/shared/types';

// GET inventory transactions
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get('item_id');
    const transactionType = searchParams.get('transaction_type');

    let queryText = `
      SELECT t.*, i.item_name, i.item_code
      FROM inventory_transactions t
      JOIN inventory_items i ON t.item_id = i.id
      WHERE 1=1
    `;
    let queryParams: any[] = [];
    let paramCount = 0;

    if (itemId) {
      paramCount++;
      queryText += ` AND t.item_id = $${paramCount}`;
      queryParams.push(itemId);
    }

    if (transactionType) {
      paramCount++;
      queryText += ` AND t.transaction_type = $${paramCount}`;
      queryParams.push(transactionType);
    }

    queryText += ' ORDER BY t.created_at DESC LIMIT 100';

    const result = await db.query<InventoryTransaction>(queryText, queryParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching inventory transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory transactions' },
      { status: 500 }
    );
  }
}

// POST create new inventory transaction
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const {
      item_id,
      transaction_type,
      quantity,
      transaction_date,
      issued_to_type,
      issued_to_id,
      unit_price,
      remarks,
      created_by,
    } = body;

    // Validation
    if (!item_id || !transaction_type || !quantity || !transaction_date) {
      return NextResponse.json(
        { success: false, error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    // Use transaction to ensure data consistency
    const result = await db.transaction(async (client) => {
      // Get current item details
      const itemResult = await client.query(
        'SELECT quantity, unit_price FROM inventory_items WHERE id = $1',
        [item_id]
      );

      if (itemResult.rows.length === 0) {
        throw new Error('Item not found');
      }

      const currentQuantity = itemResult.rows[0].quantity;
      const itemUnitPrice = unit_price || itemResult.rows[0].unit_price || 0;
      
      let newQuantity = currentQuantity;
      
      // Calculate new quantity based on transaction type
      if (transaction_type === 'purchase' || transaction_type === 'return') {
        newQuantity = currentQuantity + quantity;
      } else if (transaction_type === 'issue' || transaction_type === 'damage') {
        newQuantity = currentQuantity - quantity;
        if (newQuantity < 0) {
          throw new Error('Insufficient quantity');
        }
      } else if (transaction_type === 'adjustment') {
        newQuantity = quantity;
      }

      // Update item quantity
      await client.query(
        'UPDATE inventory_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newQuantity, item_id]
      );

      // Create transaction record
      const total_amount = quantity * itemUnitPrice;
      const transactionResult = await client.query(
        `INSERT INTO inventory_transactions (
          item_id, transaction_type, quantity, transaction_date,
          issued_to_type, issued_to_id, unit_price, total_amount, remarks, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          item_id, transaction_type, quantity, transaction_date,
          issued_to_type, issued_to_id, itemUnitPrice, total_amount, remarks, created_by
        ]
      );

      return transactionResult.rows[0];
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Inventory transaction recorded successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error recording inventory transaction:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record inventory transaction' },
      { status: 500 }
    );
  }
}










