import { NextRequest, NextResponse } from 'next/server';
import { requireLibrary } from '@/lib/library-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const result = await auth.db.query(`SELECT * FROM library_members ORDER BY name`);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Library members list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Name required' }, { status: 400 });
    }
    const result = await auth.db.query(
      `INSERT INTO library_members
        (name, card_number, email, phone, address, date_of_birth, membership_date, member_type, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        name,
        body.card_number || null,
        body.email || null,
        body.phone || null,
        body.address || null,
        body.date_of_birth || null,
        body.membership_date || null,
        body.member_type || 'student',
        body.active !== false,
      ]
    );
    const row = result.rows[0];
    if (!row.card_number) {
      const padded = await auth.db.query(
        `UPDATE library_members SET card_number = $1 WHERE id = $2 RETURNING *`,
        [`M-${String(row.id).padStart(3, '0')}`, row.id]
      );
      return NextResponse.json({ success: true, data: padded.rows[0] }, { status: 201 });
    }
    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (error) {
    console.error('Library member create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create member' }, { status: 500 });
  }
}
