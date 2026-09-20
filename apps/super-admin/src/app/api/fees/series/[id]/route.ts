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

    const current = await auth.db.query<{ academic_year: string }>(
      `SELECT academic_year FROM fee_receipt_sequences WHERE id = $1`,
      [id]
    );
    if (!current.rows[0]) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 });
    }

    if (body.is_default) {
      await auth.db.query(
        `UPDATE fee_receipt_sequences SET is_default = false WHERE academic_year = $1 AND id <> $2`,
        [current.rows[0].academic_year, id]
      );
    }

    const result = await auth.db.query(
      `UPDATE fee_receipt_sequences
       SET name = COALESCE($1, name),
           prefix = COALESCE($2, prefix),
           is_default = COALESCE($3, is_default),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [
        body.name != null ? String(body.name).trim() : null,
        body.prefix != null ? String(body.prefix).trim().toUpperCase() : null,
        body.is_default == null ? null : Boolean(body.is_default),
        body.is_active == null ? null : Boolean(body.is_active),
        id,
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating fee series:', error);
    return NextResponse.json({ success: false, error: 'Failed to update receipt series' }, { status: 500 });
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

    const current = await auth.db.query<{ last_number: number; academic_year: string }>(
      `SELECT last_number, academic_year FROM fee_receipt_sequences WHERE id = $1`,
      [id]
    );
    if (!current.rows[0]) {
      return NextResponse.json({ success: false, error: 'Series not found' }, { status: 404 });
    }

    if (current.rows[0].last_number > 0) {
      await auth.db.query(
        `UPDATE fee_receipt_sequences SET is_active = false, is_default = false, updated_at = NOW() WHERE id = $1`,
        [id]
      );
      return NextResponse.json({ success: true, data: { deactivated: true } });
    }

    await auth.db.query(`DELETE FROM fee_receipt_sequences WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fee series:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete receipt series' }, { status: 500 });
  }
}
