import { NextRequest, NextResponse } from 'next/server';
import { query } from '@edulakhya/database';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;

    // Check if category has items
    const itemsCheck = await query(
      'SELECT COUNT(*) as count FROM inventory_items WHERE category_id = $1',
      [categoryId]
    );

    const itemCount = parseInt(itemsCheck.rows[0].count);
    
    if (itemCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete category. It has ${itemCount} item(s) associated with it. Please reassign or delete those items first.` 
        },
        { status: 400 }
      );
    }

    // Delete category
    await query(
      'DELETE FROM inventory_categories WHERE id = $1',
      [categoryId]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Category deleted successfully' 
    });

  } catch (error: any) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const categoryId = params.id;
    const body = await request.json();
    const { name, description } = body;

    const result = await query(
      'UPDATE inventory_categories SET name = $1, description = $2 WHERE id = $3 RETURNING *',
      [name, description, categoryId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: result.rows[0] 
    });

  } catch (error: any) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

























































