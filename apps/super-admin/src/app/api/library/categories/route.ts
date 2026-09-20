import { NextRequest, NextResponse } from 'next/server';
import { requireLibrary } from '@/lib/library-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireLibrary(request);
    if (auth instanceof NextResponse) return auth;
    const result = await auth.db.query(`SELECT * FROM library_categories ORDER BY name`);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Library categories list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load categories' }, { status: 500 });
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
      `INSERT INTO library_categories (name) VALUES ($1) RETURNING *`,
      [name]
    );
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Library category create error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 });
  }
}
