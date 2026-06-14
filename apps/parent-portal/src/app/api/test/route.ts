import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('Test endpoint called');
    
    // Test database connection
    const result = await query('SELECT NOW() as current_time');
    console.log('Database query successful:', result.rows[0]);

    // Test if students table exists
    const studentsCount = await query('SELECT COUNT(*) as count FROM students');
    console.log('Students count:', studentsCount.rows[0]);

    // Test if any students have phone numbers
    const parentsCount = await query(
      "SELECT COUNT(*) as count FROM students WHERE father_phone IS NOT NULL OR mother_phone IS NOT NULL"
    );
    console.log('Parents count:', parentsCount.rows[0]);

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        currentTime: result.rows[0].current_time,
        totalStudents: studentsCount.rows[0].count,
        studentsWithParentPhone: parentsCount.rows[0].count,
      },
    });
  } catch (error: any) {
    console.error('Test endpoint error:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Database connection failed',
        details: {
          code: error?.code,
          hint: error?.hint,
        }
      },
      { status: 500 }
    );
  }
}



























































