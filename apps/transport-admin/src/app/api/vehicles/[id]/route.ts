import { NextRequest, NextResponse } from 'next/server';
import { query } from '@edulakhya/database';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      vehicle_number,
      vehicle_type,
      model,
      capacity,
      registration_date,
      insurance_expiry,
      pollution_certificate_expiry,
      fitness_certificate_expiry,
      owner_name,
      owner_phone,
      driver_name,
      driver_phone,
      driver_license,
      status
    } = body;

    const result = await query(
      `UPDATE vehicles SET
        vehicle_number = $1,
        vehicle_type = $2,
        model = $3,
        capacity = $4,
        registration_date = $5,
        insurance_expiry = $6,
        pollution_certificate_expiry = $7,
        fitness_certificate_expiry = $8,
        owner_name = $9,
        owner_phone = $10,
        driver_name = $11,
        driver_phone = $12,
        driver_license = $13,
        status = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *`,
      [
        vehicle_number, vehicle_type, model, capacity,
        registration_date, insurance_expiry, pollution_certificate_expiry,
        fitness_certificate_expiry, owner_name, owner_phone,
        driver_name, driver_phone, driver_license, status,
        params.id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(
      'DELETE FROM vehicles WHERE id = $1 RETURNING id',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































