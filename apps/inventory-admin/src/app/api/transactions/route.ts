import { NextRequest, NextResponse } from 'next/server';
import { query } from '@edulakhya/database';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type');
    const itemId = searchParams.get('item_id');
    
    let sql = `
      SELECT 
        t.*,
        i.item_name,
        i.item_code,
        u.full_name as created_by_name
      FROM inventory_transactions t
      LEFT JOIN inventory_items i ON t.item_id = i.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (type) {
      params.push(type);
      sql += ` AND t.transaction_type = $${params.length}`;
    }
    
    if (itemId) {
      params.push(itemId);
      sql += ` AND t.item_id = $${params.length}`;
    }
    
    sql += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT 100`;
    
    const result = await query(sql, params);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      item_id,
      transaction_type,
      quantity,
      transaction_date,
      issued_to_type,
      issued_to_id,
      unit_price,
      remarks,
      created_by
    } = body;

    // Calculate total amount
    const total_amount = unit_price ? unit_price * quantity : null;

    // Start transaction
    const client = await query('BEGIN', []);
    
    try {
      // Insert transaction
      const transactionResult = await query(
        `INSERT INTO inventory_transactions (
          item_id, transaction_type, quantity, transaction_date,
          issued_to_type, issued_to_id, unit_price, total_amount,
          remarks, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          item_id, transaction_type, quantity, transaction_date,
          issued_to_type, issued_to_id, unit_price, total_amount,
          remarks, created_by
        ]
      );

      // Update item quantity
      const quantityChange = transaction_type === 'purchase' || transaction_type === 'return' 
        ? quantity 
        : -quantity;

      await query(
        `UPDATE inventory_items 
         SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [quantityChange, item_id]
      );

      await query('COMMIT', []);

      return NextResponse.json({ success: true, data: transactionResult.rows[0] });
    } catch (error) {
      await query('ROLLBACK', []);
      throw error;
    }
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































