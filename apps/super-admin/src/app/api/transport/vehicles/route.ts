import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTransportSchema } from '@/lib/ensure-transport-schema';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    const status = request.nextUrl.searchParams.get('status');

    let queryText = 'SELECT * FROM vehicles';
    const queryParams: unknown[] = [];

    if (status) {
      queryText += ' WHERE status = $1';
      queryParams.push(status);
    }

    queryText += ' ORDER BY created_at DESC';
    const result = await db.query(queryText, queryParams);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch vehicles';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    const body = await request.json();
    const {
      vehicle_number, vehicle_type, model, capacity,
      registration_date, insurance_expiry, pollution_certificate_expiry,
      fitness_certificate_expiry, owner_name, owner_phone,
      driver_name, driver_phone, driver_license,
    } = body;

    if (!vehicle_number || !vehicle_type || !capacity) {
      return NextResponse.json({ success: false, error: 'Vehicle number, type, and capacity are required' }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO vehicles (
        vehicle_number, vehicle_type, model, capacity,
        registration_date, insurance_expiry, pollution_certificate_expiry,
        fitness_certificate_expiry, owner_name, owner_phone,
        driver_name, driver_phone, driver_license, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active')
      RETURNING *`,
      [
        vehicle_number, vehicle_type, model || null, capacity,
        registration_date || null, insurance_expiry || null,
        pollution_certificate_expiry || null, fitness_certificate_expiry || null,
        owner_name || null, owner_phone || null,
        driver_name || null, driver_phone || null, driver_license || null,
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0], message: 'Vehicle created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    const message = error instanceof Error ? error.message : 'Failed to create vehicle';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
