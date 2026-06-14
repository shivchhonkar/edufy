import { NextRequest, NextResponse } from 'next/server';
import { query } from '@EduLakhya/database';

export async function GET() {
  try {
    const result = await query(
      'SELECT * FROM vehicles ORDER BY vehicle_number',
      []
    );
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
      `INSERT INTO vehicles (
        vehicle_number, vehicle_type, model, capacity,
        registration_date, insurance_expiry, pollution_certificate_expiry,
        fitness_certificate_expiry, owner_name, owner_phone,
        driver_name, driver_phone, driver_license, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        vehicle_number, vehicle_type, model, capacity,
        registration_date, insurance_expiry, pollution_certificate_expiry,
        fitness_certificate_expiry, owner_name, owner_phone,
        driver_name, driver_phone, driver_license, status || 'active'
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































