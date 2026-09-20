import { NextRequest, NextResponse } from 'next/server';
import { requireLibrary } from '@/lib/library-utils';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const id = parseInt(params.id, 10);
    const body = await request.json();
    const result = await auth.db.query(
      `UPDATE library_members
       SET name = COALESCE($1, name),
           card_number = COALESCE($2, card_number),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           member_type = COALESCE($6, member_type),
           active = COALESCE($7, active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        body.name != null ? String(body.name).trim() : null,
        body.card_number != null ? String(body.card_number) : null,
        body.email != null ? String(body.email) : null,
        body.phone != null ? String(body.phone) : null,
        body.address != null ? String(body.address) : null,
        body.member_type != null ? String(body.member_type) : null,
        body.active == null ? null : Boolean(body.active),
        id,
      ]
    );
    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Library member update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update member' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const id = parseInt(params.id, 10);
    await auth.db.query(`DELETE FROM library_members WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Library member delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete member' }, { status: 500 });
  }
}
