import { NextRequest, NextResponse } from 'next/server';
import { requireFeeOps } from '@/lib/fee-operations-utils';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    const { id } = params;
    const body = await request.json();
    const name = body.name != null ? String(body.name).trim() : null;

    if (name !== null && !name) {
      return NextResponse.json({ success: false, error: 'Category name is required' }, { status: 400 });
    }

    const result = await auth.db.query(
      `UPDATE fee_categories
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_active = COALESCE($3, is_active)
       WHERE id = $4
       RETURNING *`,
      [
        name,
        body.description != null ? String(body.description) : null,
        body.is_active == null ? null : Boolean(body.is_active),
        id,
      ]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Fee head not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating fee category:', error);
    return NextResponse.json({ success: false, error: 'Failed to update fee head' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    const { id } = params;

    const used = await auth.db.query(
      `SELECT 1 FROM fee_structures WHERE category_id = $1 LIMIT 1`,
      [id]
    );
    if (used.rows.length) {
      await auth.db.query(`UPDATE fee_categories SET is_active = false WHERE id = $1`, [id]);
      return NextResponse.json({ success: true, data: { deactivated: true } });
    }

    await auth.db.query(`DELETE FROM fee_categories WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fee category:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete fee head' }, { status: 500 });
  }
}
