import { NextRequest, NextResponse } from 'next/server';
import { getRequestDbOrError } from '@/lib/request-db';

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const driversResult = await db.query('SELECT * FROM drivers ORDER BY name');

    const vehicleDriversResult = await db.query(
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
    );

    const allDrivers = [...driversResult.rows];
    const existingPhones = new Set(
      driversResult.rows.map((d: { phone?: string | null }) => d.phone),
    );

    vehicleDriversResult.rows.forEach((vd: Record<string, unknown>) => {
      const phone = vd.phone as string | undefined;
      if (phone && !existingPhones.has(phone)) {
        allDrivers.push({
          ...vd,
          source: 'vehicle',
          id: `v-${vd.vehicle_number}`,
        });
        existingPhones.add(phone);
      }
    });

    return NextResponse.json({ success: true, data: allDrivers });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load drivers' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request);
    if (dbResult instanceof NextResponse) return dbResult;
    const { db } = dbResult;

    const body = await request.json();
    const { name, phone, license_number, license_expiry, address, photo_url, status } = body;

    const result = await db.query(
      `INSERT INTO drivers (
        name, phone, license_number, license_expiry,
        address, photo_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [name, phone, license_number, license_expiry, address, photo_url, status || 'active'],
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating driver:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create driver' },
      { status: 500 },
    );
  }
}
