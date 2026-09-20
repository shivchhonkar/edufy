import { NextRequest, NextResponse } from 'next/server';
import { requireInventory, writeAudit } from '@/lib/inventory-utils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireInventory(request);
    if (auth instanceof NextResponse) return auth;
    const result = await auth.db.query(
      `SELECT i.*, c.name AS category_name
       FROM inventory_items i
       LEFT JOIN inventory_categories c ON c.id = i.category_id
       WHERE i.id = $1`,
      [params.id]
    );
    if (!result.rows[0]) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to load item' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireInventory(request, true);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const result = await auth.db.query(
      `UPDATE inventory_items SET
         category_id = COALESCE($1, category_id),
         item_name = COALESCE($2, item_name),
         item_code = COALESCE($3, item_code),
         description = COALESCE($4, description),
         unit = COALESCE($5, unit),
         min_stock_level = COALESCE($6, min_stock_level),
         unit_price = COALESCE($7, unit_price),
         gst_percentage = COALESCE($8, gst_percentage),
         hsn_code = COALESCE($9, hsn_code),
         vendor_id = COALESCE($10, vendor_id),
         unit_id = COALESCE($11, unit_id),
         barcode = COALESCE($12, barcode),
         is_asset = COALESCE($13, is_asset),
         reorder_qty = COALESCE($14, reorder_qty),
         is_active = COALESCE($15, is_active),
         size = COALESCE($16, size),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $17
       RETURNING *`,
      [
        body.category_id ?? null,
        body.item_name != null ? String(body.item_name).trim() : null,
        body.item_code != null ? String(body.item_code).trim() : null,
        body.description ?? null,
        body.unit ?? null,
        body.min_stock_level ?? null,
        body.unit_price ?? null,
        body.gst_percentage ?? null,
        body.hsn_code ?? null,
        body.vendor_id ?? null,
        body.unit_id ?? null,
        body.barcode ?? null,
        body.is_asset == null ? null : Boolean(body.is_asset),
        body.reorder_qty ?? null,
        body.is_active == null ? null : Boolean(body.is_active),
        body.size != null ? String(body.size).trim() || null : null,
        params.id,
      ]
    );
    if (!result.rows[0]) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    await writeAudit(auth.db, auth.user, 'update', 'item', Number(params.id), body);
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireInventory(request, true);
    if (auth instanceof NextResponse) return auth;
    await auth.db.query(`DELETE FROM inventory_items WHERE id = $1`, [params.id]);
    await writeAudit(auth.db, auth.user, 'delete', 'item', Number(params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Cannot delete item with stock history' }, { status: 400 });
  }
}
