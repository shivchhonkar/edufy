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
        COALESCE(NULLIF(TRIM(driver_name), ''), NULLIF(TRIM(owner_name), '')) AS name,
        COALESCE(NULLIF(TRIM(driver_phone), ''), NULLIF(TRIM(owner_phone), '')) AS phone,
        driver_license AS license_number,
        NULL AS license_expiry,
        NULL AS address,
        status,
        vehicle_number,
        vehicle_type,
        CASE
          WHEN driver_name IS NOT NULL AND TRIM(driver_name) <> '' THEN 'driver'
          ELSE 'owner'
        END AS role
       FROM vehicles
       WHERE (
         (driver_name IS NOT NULL AND TRIM(driver_name) <> '')
         OR (owner_name IS NOT NULL AND TRIM(owner_name) <> '')
       )
       ORDER BY name`,
    );

    const allDrivers = [...driversResult.rows];
    const existingKeys = new Set(
      driversResult.rows.map((d: { phone?: string | null; name?: string | null }) =>
        String(d.phone || d.name || '')
          .trim()
          .toLowerCase(),
      ),
    );

    vehicleDriversResult.rows.forEach((vd: Record<string, unknown>) => {
      const name = String(vd.name || '').trim();
      if (!name) return;

      const phone = String(vd.phone || '').trim();
      const vehicleNumber = String(vd.vehicle_number || '').trim();
      const dedupeKey = phone
        ? phone.toLowerCase()
        : `${name.toLowerCase()}::${vehicleNumber}`.toLowerCase();

      if (existingKeys.has(dedupeKey)) return;

      allDrivers.push({
        ...vd,
        name,
        phone: phone || null,
        source: 'vehicle',
        id: `v-${vehicleNumber || name}`,
      });
      existingKeys.add(dedupeKey);
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
