import { NextRequest, NextResponse } from 'next/server';
import { query } from '@EduLakhya/database';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const routeResult = await query(
      'SELECT * FROM routes WHERE id = $1',
      [params.id]
    );

    if (routeResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Route not found' },
        { status: 404 }
      );
    }

    const stopsResult = await query(
      'SELECT * FROM route_stops WHERE route_id = $1 ORDER BY stop_order',
      [params.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        route: routeResult.rows[0],
        stops: stopsResult.rows
      }
    });
  } catch (error: any) {
    console.error('Error fetching route:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      route_name,
      route_number,
      starting_point,
      ending_point,
      total_distance,
      estimated_time,
      status
    } = body;

    const result = await query(
      `UPDATE routes SET
        route_name = $1,
        route_number = $2,
        starting_point = $3,
        ending_point = $4,
        total_distance = $5,
        estimated_time = $6,
        status = $7
      WHERE id = $8
      RETURNING *`,
      [
        route_name, route_number, starting_point, ending_point,
        total_distance, estimated_time, status, params.id
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Route not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating route:', error);
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
      'DELETE FROM routes WHERE id = $1 RETURNING id',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Route not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Route deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting route:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































