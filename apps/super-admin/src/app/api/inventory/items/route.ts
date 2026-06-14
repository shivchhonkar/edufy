import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { InventoryItem } from '@/shared/types';
import { generateRandomString } from '@/lib/utils';

// GET all inventory items
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('category_id');
    const lowStock = searchParams.get('low_stock');

    let queryText = `
      SELECT i.*, c.name as category_name
      FROM inventory_items i
      LEFT JOIN inventory_categories c ON i.category_id = c.id
      WHERE 1=1
    `;
    let queryParams: any[] = [];
    let paramCount = 0;

    if (categoryId) {
      paramCount++;
      queryText += ` AND i.category_id = $${paramCount}`;
      queryParams.push(categoryId);
    }

    if (lowStock === 'true') {
      queryText += ' AND i.quantity <= COALESCE(i.min_stock_level, 0)';
    }

    queryText += ' ORDER BY i.created_at DESC';

    const result = await db.query<InventoryItem>(queryText, queryParams);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory items' },
      { status: 500 }
    );
  }
}

// POST create new inventory item
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const {
      category_id,
      item_name,
      description,
      unit,
      quantity,
      min_stock_level,
      unit_price,
      supplier_name,
      supplier_contact,
      location,
    } = body;

    // Validation
    if (!item_name) {
      return NextResponse.json(
        { success: false, error: 'Item name is required' },
        { status: 400 }
      );
    }

    // Generate item code
    const item_code = `ITM${generateRandomString(8)}`;

    const result = await db.query<InventoryItem>(
      `INSERT INTO inventory_items (
        category_id, item_name, item_code, description, unit, quantity,
        min_stock_level, unit_price, supplier_name, supplier_contact, location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        category_id, item_name, item_code, description, unit, quantity || 0,
        min_stock_level, unit_price, supplier_name, supplier_contact, location
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Inventory item created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}








