import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    console.log('🚀 Starting Staff Attendance Migration...');
    
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'database', 'migrations', 'add_staff_attendance.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.query(migrationSQL);
    
    console.log('✅ Staff Attendance Migration completed successfully!');
    
    return NextResponse.json({
      success: true,
      message: 'Staff Attendance Migration completed successfully!',
      tables_created: [
        'staff_attendance',
        'punch_machines', 
        'punch_machine_logs',
        'leave_types',
        'staff_leaves',
        'attendance_policies'
      ]
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Migration failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}








