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
    const routeResult = await db.query('SELECT * FROM routes WHERE id = $1', [params.id]);
    if (!routeResult.rows.length) {
      return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
    }
    const stopsResult = await db.query(
      'SELECT * FROM route_stops WHERE route_id = $1 ORDER BY stop_order ASC',
      [params.id]
    );
    const route = routeResult.rows[0] as Record<string, unknown>;
    return NextResponse.json({
      success: true,
      data: { ...route, stops: stopsResult.rows },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch route' }, { status: 500 });
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
    const { route_name, route_number, starting_point, ending_point, total_distance, estimated_time, monthly_fee, status, stops } = body;

    await db.query('BEGIN');
    try {
      if (route_number) {
        const conflict = await db.query(
          'SELECT id FROM routes WHERE route_number = $1 AND id != $2',
          [route_number, params.id]
        );
        if (conflict.rows.length) {
          await db.query('ROLLBACK');
          return NextResponse.json({ success: false, error: `Route number "${route_number}" is already in use` }, { status: 400 });
        }
      }

      const result = await db.query(
        `UPDATE routes SET route_name=$1, route_number=$2, starting_point=$3, ending_point=$4,
          total_distance=$5, estimated_time=$6, monthly_fee=$7, status=$8, updated_at=CURRENT_TIMESTAMP
         WHERE id=$9 RETURNING *`,
        [route_name, route_number || null, starting_point || null, ending_point || null, total_distance || null, estimated_time || null, monthly_fee || null, status || 'active', params.id]
      );
      if (!result.rows.length) {
        await db.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
      }

      if (stops && Array.isArray(stops)) {
        const existing = await db.query('SELECT id FROM route_stops WHERE route_id = $1', [params.id]);
        const existingIds = (existing.rows as { id: number }[]).map((r) => r.id);
        const keptIds: number[] = [];

        for (const stop of stops) {
          if (!stop.stop_name?.trim()) continue;
          if (stop.id) {
            await db.query(
              `UPDATE route_stops SET stop_name=$1, stop_order=$2, arrival_time=$3, pickup_fee=$4 WHERE id=$5 AND route_id=$6`,
              [stop.stop_name, stop.stop_order, stop.arrival_time || null, stop.pickup_fee || null, stop.id, params.id]
            );
            keptIds.push(stop.id);
          } else {
            const ins = await db.query(
              `INSERT INTO route_stops (route_id, stop_name, stop_order, arrival_time, pickup_fee) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
              [params.id, stop.stop_name, stop.stop_order, stop.arrival_time || null, stop.pickup_fee || null]
            );
            keptIds.push((ins.rows[0] as { id: number }).id);
          }
        }

        const toDelete = existingIds.filter((id) => !keptIds.includes(id));
        if (toDelete.length) {
          const inUse = await db.query('SELECT stop_id FROM student_transport WHERE stop_id = ANY($1)', [toDelete]);
          if (inUse.rows.length) {
            await db.query('ROLLBACK');
            return NextResponse.json({ success: false, error: 'Cannot remove stops assigned to students' }, { status: 400 });
          }
          await db.query('DELETE FROM route_stops WHERE id = ANY($1)', [toDelete]);
        }
      }

      await db.query('COMMIT');
      return NextResponse.json({ success: true, data: result.rows[0], message: 'Route updated successfully' });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update route';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { db } = await getRequestDb(request);
    const students = await db.query(
      "SELECT id FROM student_transport WHERE route_id = $1 AND status = 'active' LIMIT 1",
      [params.id]
    );
    if (students.rows.length) {
      return NextResponse.json({ success: false, error: 'Cannot delete route with active student assignments' }, { status: 409 });
    }
    await db.query('DELETE FROM route_stops WHERE route_id = $1', [params.id]);
    const result = await db.query('DELETE FROM routes WHERE id = $1 RETURNING id', [params.id]);
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Route not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Route deleted successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete route' }, { status: 500 });
  }
}
