import { NextRequest, NextResponse } from 'next/server';
import { query } from '@edulakhya/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { student_id, items, created_by } = body;

    // Start transaction
    await query('BEGIN', []);
    
    try {
      const saleTransactions = [];
      let totalAmount = 0;

      for (const item of items) {
        const { item_id, quantity, unit_price } = item;
        const amount = quantity * unit_price;
        totalAmount += amount;

        // Create inventory transaction
        const transactionResult = await query(
          `INSERT INTO inventory_transactions (
            item_id, transaction_type, quantity, transaction_date,
            issued_to_type, issued_to_id, unit_price, total_amount,
            created_by
          ) VALUES ($1, 'issue', $2, CURRENT_DATE, 'student', $3, $4, $5, $6)
          RETURNING *`,
          [item_id, quantity, student_id, unit_price, amount, created_by]
        );

        // Update item quantity
        await query(
          `UPDATE inventory_items 
           SET quantity = quantity - $1, updated_at = CURRENT_TIMESTAMP 
           WHERE id = $2`,
          [quantity, item_id]
        );

        // Add to student_inventory
        await query(
          `INSERT INTO student_inventory (
            student_id, item_id, quantity, issue_date, amount_charged, status
          ) VALUES ($1, $2, $3, CURRENT_DATE, $4, 'issued')`,
          [student_id, item_id, quantity, amount]
        );

        saleTransactions.push(transactionResult.rows[0]);
      }

      await query('COMMIT', []);

      return NextResponse.json({ 
        success: true, 
        data: { 
          transactions: saleTransactions, 
          total_amount: totalAmount 
        } 
      });
    } catch (error) {
      await query('ROLLBACK', []);
      throw error;
    }
  } catch (error: any) {
    console.error('Error creating sale:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































