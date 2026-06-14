import { NextResponse } from 'next/server';
import { query } from '@EduLakhya/database';

export async function GET() {
  try {
    // Total items count
    const totalItems = await query(
      'SELECT COUNT(*) as count FROM inventory_items',
      []
    );

    // Low stock items
    const lowStockItems = await query(
      `SELECT COUNT(*) as count 
       FROM inventory_items 
       WHERE quantity <= min_stock_level AND min_stock_level IS NOT NULL`,
      []
    );

    // Sales this month
    const salesThisMonth = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as total
       FROM inventory_transactions 
       WHERE transaction_type = 'issue' 
       AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      []
    );

    // Students served this month
    const studentsServed = await query(
      `SELECT COUNT(DISTINCT issued_to_id) as count
       FROM inventory_transactions 
       WHERE transaction_type = 'issue'
       AND issued_to_type = 'student'
       AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      []
    );

    // Low stock alert items
    const lowStockAlerts = await query(
      `SELECT 
        id,
        item_name,
        quantity,
        min_stock_level,
        unit_price
       FROM inventory_items 
       WHERE quantity <= min_stock_level 
       AND min_stock_level IS NOT NULL
       ORDER BY (quantity - min_stock_level) ASC
       LIMIT 10`,
      []
    );

    const stats = {
      total_items: parseInt(totalItems.rows[0].count),
      low_stock_count: parseInt(lowStockItems.rows[0].count),
      sales_this_month: parseFloat(salesThisMonth.rows[0].total),
      students_served: parseInt(studentsServed.rows[0].count),
      low_stock_alerts: lowStockAlerts.rows
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































