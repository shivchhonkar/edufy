import { NextRequest, NextResponse } from 'next/server';
import { query } from '@edulakhya/database';

export async function GET() {
  try {
    const result = await query(
      `SELECT 
        st.*,
        s.first_name, s.last_name, s.admission_number, s.class_id,
        r.route_name, r.route_number,
        rs.stop_name
      FROM student_transport st
      JOIN students s ON st.student_id = s.id
      LEFT JOIN routes r ON st.route_id = r.id
      LEFT JOIN route_stops rs ON st.stop_id = rs.id
      ORDER BY s.first_name, s.last_name`,
      []
    );
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
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
      student_id,
      route_id,
      stop_id,
      transport_fee,
      start_date,
      end_date,
      status
    } = body;

    const result = await query(
      `INSERT INTO student_transport (
        student_id, route_id, stop_id, transport_fee,
        start_date, end_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        student_id, route_id, stop_id, transport_fee,
        start_date, end_date, status || 'active'
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































