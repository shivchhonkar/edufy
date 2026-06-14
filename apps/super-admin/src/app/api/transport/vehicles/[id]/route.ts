import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTransportSchema } from '@/lib/ensure-transport-schema';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    const result = await db.query('SELECT * FROM vehicles WHERE id = $1', [params.id]);
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch vehicle' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    const body = await request.json();
    const result = await db.query(
      `UPDATE vehicles SET
        vehicle_number = $1, vehicle_type = $2, model = $3, capacity = $4,
        registration_date = $5, insurance_expiry = $6, pollution_certificate_expiry = $7,
        fitness_certificate_expiry = $8, owner_name = $9, owner_phone = $10,
        driver_name = $11, driver_phone = $12, driver_license = $13, status = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15 RETURNING *`,
      [
        body.vehicle_number, body.vehicle_type, body.model || null, body.capacity,
        body.registration_date || null, body.insurance_expiry || null,
        body.pollution_certificate_expiry || null, body.fitness_certificate_expiry || null,
        body.owner_name || null, body.owner_phone || null,
        body.driver_name || null, body.driver_phone || null, body.driver_license || null,
        body.status || 'active', params.id,
      ]
    );
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update vehicle' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const result = await db.query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [params.id]);
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Vehicle not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete vehicle' }, { status: 500 });
  }
}
