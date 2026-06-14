import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTransportSchema } from '@/lib/ensure-transport-schema';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    const routeId = request.nextUrl.searchParams.get('route_id');
    const status = request.nextUrl.searchParams.get('status') || 'active';

    let queryText = `
      SELECT va.*, r.route_name, r.route_number,
             v.vehicle_number, v.vehicle_type, v.model, v.capacity, v.driver_name, v.driver_phone
      FROM vehicle_assignments va
      JOIN routes r ON va.route_id = r.id
      JOIN vehicles v ON va.vehicle_id = v.id
      WHERE va.status = $1
    `;
    const queryParams: unknown[] = [status];

    if (routeId) {
      queryText += ' AND va.route_id = $2';
      queryParams.push(routeId);
    }

    queryText += ' ORDER BY r.route_name ASC, va.assigned_date DESC';
    const result = await db.query(queryText, queryParams);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch route assignments';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    const { vehicle_id, route_id, assigned_date, shift } = await request.json();

    if (!vehicle_id || !route_id) {
      return NextResponse.json({ success: false, error: 'Vehicle and route are required' }, { status: 400 });
    }

    await db.query(
      "UPDATE vehicle_assignments SET status = 'inactive' WHERE route_id = $1 AND status = 'active'",
      [route_id]
    );

    const result = await db.query(
      `INSERT INTO vehicle_assignments (vehicle_id, route_id, assigned_date, shift, status)
       VALUES ($1,$2,$3,$4,'active') RETURNING *`,
      [vehicle_id, route_id, assigned_date || new Date().toISOString().split('T')[0], shift || 'both']
    );

    return NextResponse.json({ success: true, data: result.rows[0], message: 'Vehicle assigned to route' }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to assign vehicle';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
