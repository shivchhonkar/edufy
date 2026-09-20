import { NextRequest, NextResponse } from 'next/server';
import { requireInventory } from '@/lib/inventory-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInventory(request);
    if (auth instanceof NextResponse) return auth;
    const result = await auth.db.query(
      `SELECT * FROM inventory_audit_log ORDER BY created_at DESC, id DESC LIMIT 300`
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to load audit trail' }, { status: 500 });
  }
}
