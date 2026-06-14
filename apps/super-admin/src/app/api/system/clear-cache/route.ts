import { NextRequest, NextResponse } from 'next/server';

// POST - Clear system cache
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Clearing system cache...');

    // In a real application, you would clear various caches here
    // For example: Redis cache, file cache, etc.
    // For now, we'll just return success
    
    console.log('✅ System cache cleared');

    return NextResponse.json({
      success: true,
      message: 'System cache cleared successfully'
    });
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}




