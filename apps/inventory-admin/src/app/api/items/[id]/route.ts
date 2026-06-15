import { NextRequest, NextResponse } from 'next/server';
import { query } from '@edulakhya/database';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      category_id,
      item_name,
      item_code,
      description,
      unit,
      min_stock_level,
      unit_price,
      supplier_name,
      supplier_contact,
      location
    } = body;

    const result = await query(
      `UPDATE inventory_items SET
        category_id = $1,
        item_name = $2,
        item_code = $3,
        description = $4,
        unit = $5,
        min_stock_level = $6,
        unit_price = $7,
        supplier_name = $8,
        supplier_contact = $9,
        location = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *`,
      [
        category_id, item_name, item_code, description, unit,
        min_stock_level, unit_price, supplier_name,
        supplier_contact, location, params.id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(
      'DELETE FROM inventory_items WHERE id = $1 RETURNING id',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Item deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































