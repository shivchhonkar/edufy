import { NextRequest, NextResponse } from 'next/server';
import { requireLibrary } from '@/lib/library-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const result = await auth.db.query(`SELECT * FROM library_vendors ORDER BY name`);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Library vendors list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load vendors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Vendor name is required' }, { status: 400 });
    }
    const result = await auth.db.query(
      `INSERT INTO library_vendors (name, contact_person, phone, email, address, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        body.contact_person || null,
        body.phone || null,
        body.email || null,
        body.address || null,
        body.is_active !== false,
      ]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Library vendor create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create vendor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const id = Number(body.id);
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    const result = await auth.db.query(
      `UPDATE library_vendors
       SET name = COALESCE($1, name),
           contact_person = COALESCE($2, contact_person),
           phone = COALESCE($3, phone),
           email = COALESCE($4, email),
           address = COALESCE($5, address),
           is_active = COALESCE($6, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        body.name != null ? String(body.name).trim() : null,
        body.contact_person != null ? String(body.contact_person) : null,
        body.phone != null ? String(body.phone) : null,
        body.email != null ? String(body.email) : null,
        body.address != null ? String(body.address) : null,
        body.is_active == null ? null : Boolean(body.is_active),
        id,
      ]
    );
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Library vendor update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update vendor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const id = Number(request.nextUrl.searchParams.get('id') || '');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    await auth.db.query(`DELETE FROM library_vendors WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Library vendor delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete vendor' }, { status: 500 });
  }
}
