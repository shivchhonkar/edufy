import { NextRequest, NextResponse } from 'next/server';
import { query } from '@edulakhya/database';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get('q') || '';
    
    const result = await query(
      `SELECT 
        id, 
        admission_number, 
        first_name, 
        last_name,
        class_id,
        roll_number
      FROM students 
      WHERE status = 'active' AND (
        admission_number ILIKE $1 
        OR first_name ILIKE $1 
        OR last_name ILIKE $1
      )
      ORDER BY first_name, last_name
      LIMIT 20`,
      [`%${search}%`]
    );
    
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error searching students:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


























































