import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
// POST - Optimize database
export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    console.log('🔄 Starting database optimization...');

    // Run VACUUM ANALYZE on all tables
    await db.query('VACUUM ANALYZE', []);
    
    console.log('✅ Database optimization completed');

    return NextResponse.json({
      success: true,
      message: 'Database optimized successfully'
    });
  } catch (error: any) {
    console.error('Error optimizing database:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}




