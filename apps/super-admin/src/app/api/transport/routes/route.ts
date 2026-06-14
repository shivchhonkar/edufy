import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureTransportSchema } from '@/lib/ensure-transport-schema';

export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    const status = request.nextUrl.searchParams.get('status');

    let queryText = `
      SELECT r.*,
             COUNT(DISTINCT rs.id) as total_stops,
             COUNT(DISTINCT st.id) as total_students
      FROM routes r
      LEFT JOIN route_stops rs ON r.id = rs.route_id
      LEFT JOIN student_transport st ON r.id = st.route_id AND st.status = 'active'
    `;
    const queryParams: unknown[] = [];

    if (status) {
      queryText += ' WHERE r.status = $1';
      queryParams.push(status);
    }

    queryText += ' GROUP BY r.id ORDER BY r.created_at DESC';
    const result = await db.query(queryText, queryParams);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching routes:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch routes';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    const { route_name, route_number, starting_point, ending_point, total_distance, estimated_time, monthly_fee, stops } = await request.json();

    if (!route_name) {
      return NextResponse.json({ success: false, error: 'Route name is required' }, { status: 400 });
    }

    const routeResult = await db.query(
      `INSERT INTO routes (route_name, route_number, starting_point, ending_point, total_distance, estimated_time, monthly_fee, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active') RETURNING *`,
      [route_name, route_number || null, starting_point || null, ending_point || null, total_distance || null, estimated_time || null, monthly_fee || null]
    );
    const newRoute = routeResult.rows[0] as { id: number };

    if (stops && Array.isArray(stops)) {
      for (const stop of stops) {
        if (!stop.stop_name?.trim()) continue;
        await db.query(
          `INSERT INTO route_stops (route_id, stop_name, stop_order, arrival_time, pickup_fee)
           VALUES ($1,$2,$3,$4,$5)`,
          [newRoute.id, stop.stop_name.trim(), stop.stop_order, stop.arrival_time || null, stop.pickup_fee || null]
        );
      }
    }

    return NextResponse.json({ success: true, data: newRoute, message: 'Route created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error creating route:', error);
    const message = error instanceof Error ? error.message : 'Failed to create route';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureTransportSchema(db);
    const { id, route_name, route_number, starting_point, ending_point, total_distance, estimated_time, monthly_fee, status, stops } = await request.json();

    if (!id || !route_name) {
      return NextResponse.json({ success: false, error: 'Route ID and name are required' }, { status: 400 });
    }

    await db.query('BEGIN');
    try {
      const routeResult = await db.query(
        `UPDATE routes SET route_name=$1, route_number=$2, starting_point=$3, ending_point=$4,
          total_distance=$5, estimated_time=$6, monthly_fee=$7, status=$8, updated_at=CURRENT_TIMESTAMP
         WHERE id=$9 RETURNING *`,
        [route_name, route_number || null, starting_point || null, ending_point || null, total_distance || null, estimated_time || null, monthly_fee || null, status || 'active', id]
      );
      if (!routeResult.rows.length) {
        await db.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
      }

      await db.query('DELETE FROM route_stops WHERE route_id = $1', [id]);
      if (stops && Array.isArray(stops)) {
        for (const stop of stops) {
          if (!stop.stop_name?.trim()) continue;
          await db.query(
            `INSERT INTO route_stops (route_id, stop_name, stop_order, arrival_time, pickup_fee)
             VALUES ($1,$2,$3,$4,$5)`,
            [id, stop.stop_name.trim(), stop.stop_order, stop.arrival_time || null, stop.pickup_fee || null]
          );
        }
      }
      await db.query('COMMIT');
      return NextResponse.json({ success: true, data: routeResult.rows[0], message: 'Route updated successfully' });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    console.error('Error updating route:', error);
    const message = error instanceof Error ? error.message : 'Failed to update route';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
