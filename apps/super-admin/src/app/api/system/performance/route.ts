import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// GET - Fetch system performance metrics
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    // Get database size
    const dbSizeResult = await db.query(
      `SELECT pg_database_size(current_database()) as size`,
      []
    );
    
    const database_size = dbSizeResult.rows[0]?.size || 0;

    // Get active users count (users who logged in today)
    const activeUsersResult = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE is_active = true`,
      []
    );
    
    const active_users = parseInt(activeUsersResult.rows[0]?.count || '0');

    // Mock system uptime (in production, this would come from actual system metrics)
    const system_uptime = process.uptime() || 0;

    // Mock memory and CPU usage (in production, use actual metrics)
    const memory_usage = Math.floor(Math.random() * 30) + 40; // 40-70%
    const cpu_usage = Math.floor(Math.random() * 20) + 10; // 10-30%

    return NextResponse.json({
      success: true,
      data: {
        database_size,
        last_backup: null,
        active_users,
        system_uptime,
        memory_usage,
        cpu_usage
      }
    });
  } catch (error: any) {
    console.error('Error fetching system performance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}




