import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get students with parent phone numbers
    const result = await query(
      `SELECT 
        s.id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.parent_name,
        s.parent_phone,
        c.name as class_name
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       WHERE s.parent_phone IS NOT NULL
       AND s.parent_phone != ''
       ORDER BY s.first_name
       LIMIT 10`
    );

    return NextResponse.json({
      success: true,
      message: `Found ${result.rows.length} students with parent phone numbers`,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching parent phones:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to fetch parent phones'
      },
      { status: 500 }
    );
  }
}



























































