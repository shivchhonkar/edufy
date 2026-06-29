import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const body = await request.json();
    const { name, phone, license_number, license_expiry, address, photo_url, status } = body;

    const result = await db.query(
      `UPDATE drivers SET
        name = $1,
        phone = $2,
        license_number = $3,
        license_expiry = $4,
        address = $5,
        photo_url = $6,
        status = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *`,
      [name, phone, license_number, license_expiry, address, photo_url, status, params.id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Driver not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating driver:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update driver' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const result = await db.query('DELETE FROM drivers WHERE id = $1 RETURNING id', [params.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Driver not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Error deleting driver:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete driver' },
      { status: 500 },
    );
  }
}
