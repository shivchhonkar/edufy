import { NextRequest, NextResponse } from 'next/server';
import { query } from '@EduLakhya/database';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { stop_name, stop_order, arrival_time, pickup_fee } = body;

    const result = await query(
      `INSERT INTO route_stops (
        route_id, stop_name, stop_order, arrival_time, pickup_fee
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [params.id, stop_name, stop_order, arrival_time, pickup_fee]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating stop:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































