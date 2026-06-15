import { NextRequest, NextResponse } from 'next/server';
import { query } from '@edulakhya/database';

export async function GET() {
  try {
    console.log('Fetching drivers from database...');
    
    // Fetch from drivers table
    const driversResult = await query(
      'SELECT * FROM drivers ORDER BY name',
      []
    );
    
    // Also fetch unique drivers from vehicles table
    const vehicleDriversResult = await query(
      `SELECT DISTINCT
        driver_name as name,
        driver_phone as phone,
        driver_license as license_number,
        NULL as license_expiry,
        NULL as address,
        'active' as status,
        NULL as id,
        vehicle_number,
        vehicle_type
       FROM vehicles 
       WHERE driver_name IS NOT NULL 
       AND driver_name != ''
       ORDER BY driver_name`,
      []
    );
    
    // Combine both sources, avoiding duplicates by phone number
    const allDrivers = [...driversResult.rows];
    const existingPhones = new Set(driversResult.rows.map((d: any) => d.phone));
    
    // Add vehicle drivers that don't exist in drivers table
    vehicleDriversResult.rows.forEach((vd: any) => {
      if (vd.phone && !existingPhones.has(vd.phone)) {
        allDrivers.push({
          ...vd,
          source: 'vehicle',
          id: `v-${vd.vehicle_number}` // Temporary ID for vehicle-based drivers
        });
        existingPhones.add(vd.phone);
      }
    });
    
    console.log('Drivers from drivers table:', driversResult.rows.length);
    console.log('Drivers from vehicles table:', vehicleDriversResult.rows.length);
    console.log('Total unique drivers:', allDrivers.length);
    
    return NextResponse.json({ success: true, data: allDrivers });
  } catch (error: any) {
    console.error('Error fetching drivers:', error);
    console.error('Error details:', error.message, error.stack);
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
      name,
      phone,
      license_number,
      license_expiry,
      address,
      photo_url,
      status
    } = body;

    const result = await query(
      `INSERT INTO drivers (
        name, phone, license_number, license_expiry,
        address, photo_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        name, phone, license_number, license_expiry,
        address, photo_url, status || 'active'
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating driver:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

