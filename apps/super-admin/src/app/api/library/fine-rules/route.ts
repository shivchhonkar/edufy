import { NextRequest, NextResponse } from 'next/server';
import { requireLibrary } from '@/lib/library-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const result = await auth.db.query(`SELECT * FROM library_fine_rules ORDER BY borrower_type, id`);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Library fine rules list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load fine rules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Rule name is required' }, { status: 400 });
    }
    const result = await auth.db.query(
      `INSERT INTO library_fine_rules
        (name, borrower_type, days_allowed, fine_per_day, max_fine, grace_days, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        body.borrower_type === 'staff' || body.borrower_type === 'all' ? body.borrower_type : 'student',
        parseInt(String(body.days_allowed ?? 14), 10) || 14,
        parseFloat(String(body.fine_per_day ?? 10)) || 0,
        body.max_fine != null && body.max_fine !== '' ? parseFloat(String(body.max_fine)) : null,
        parseInt(String(body.grace_days ?? 0), 10) || 0,
        body.is_active !== false,
      ]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Library fine rule create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create fine rule' }, { status: 500 });
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
      `UPDATE library_fine_rules
       SET name = COALESCE($1, name),
           borrower_type = COALESCE($2, borrower_type),
           days_allowed = COALESCE($3, days_allowed),
           fine_per_day = COALESCE($4, fine_per_day),
           max_fine = $5,
           grace_days = COALESCE($6, grace_days),
           is_active = COALESCE($7, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        body.name != null ? String(body.name).trim() : null,
        body.borrower_type != null ? String(body.borrower_type) : null,
        body.days_allowed != null ? parseInt(String(body.days_allowed), 10) : null,
        body.fine_per_day != null ? parseFloat(String(body.fine_per_day)) : null,
        body.max_fine === '' || body.max_fine == null ? null : parseFloat(String(body.max_fine)),
        body.grace_days != null ? parseInt(String(body.grace_days), 10) : null,
        body.is_active == null ? null : Boolean(body.is_active),
        id,
      ]
    );
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Library fine rule update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update fine rule' }, { status: 500 });
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
    await auth.db.query(`DELETE FROM library_fine_rules WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Library fine rule delete error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete fine rule' }, { status: 500 });
  }
}
