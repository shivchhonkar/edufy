import { NextRequest, NextResponse } from 'next/server';
import { query } from '@edulakhya/database';

export async function GET() {
  try {
    const result = await query(
      `SELECT r.*, 
       (SELECT COUNT(*) FROM route_stops WHERE route_id = r.id) as stops_count
       FROM routes r 
       ORDER BY r.route_number`,
      []
    );
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching routes:', error);
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
      route_name,
      route_number,
      starting_point,
      ending_point,
      total_distance,
      estimated_time,
      status
    } = body;

    const result = await query(
      `INSERT INTO routes (
        route_name, route_number, starting_point, ending_point,
        total_distance, estimated_time, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        route_name, route_number, starting_point, ending_point,
        total_distance, estimated_time, status || 'active'
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating route:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































