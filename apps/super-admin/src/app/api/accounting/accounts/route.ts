import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const result = await db.query(
      'SELECT * FROM accounting_accounts WHERE is_active = true ORDER BY code'
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Accounts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accounts. Run phase9 migration.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const { code, name, account_type, parent_id } = await request.json();

    if (!code || !name || !account_type) {
      return NextResponse.json(
        { success: false, error: 'code, name, and account_type are required' },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO accounting_accounts (code, name, account_type, parent_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [code, name, account_type, parent_id || null]
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('Create account error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create account' }, { status: 500 });
  }
}
