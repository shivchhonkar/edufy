import { NextRequest, NextResponse } from 'next/server';
import { query } from '@edulakhya/database';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    
    let sql = `
      SELECT 
        i.*,
        c.name as category_name
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (category) {
      params.push(category);
      sql += ` AND i.category_id = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (i.item_name ILIKE $${params.length} OR i.item_code ILIKE $${params.length})`;
    }
    
    sql += ` ORDER BY i.item_name`;
    
    const result = await query(sql, params);
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching items:', error);
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
      category_id,
      item_name,
      item_code,
      description,
      unit,
      quantity,
      min_stock_level,
      unit_price,
      supplier_name,
      supplier_contact,
      location
    } = body;

    const result = await query(
      `INSERT INTO inventory_items (
        category_id, item_name, item_code, description, unit,
        quantity, min_stock_level, unit_price, supplier_name,
        supplier_contact, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        category_id, item_name, item_code, description, unit,
        quantity || 0, min_stock_level, unit_price, supplier_name,
        supplier_contact, location
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































