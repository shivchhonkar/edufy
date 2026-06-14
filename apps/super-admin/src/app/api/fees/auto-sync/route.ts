import { NextRequest, NextResponse } from 'next/server';
import { 
  syncTransportFeesForStudent, 
  recalculateStudentFeeStatus, 
  universalFeeSync, 
  cleanupOrphanedFees 
} from '@/features/fees/utils/autoFeeSync';

// POST - Universal fee sync endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action, 
      studentId, 
      feeStructureId, 
      newAmount, 
      academicYear = '2025-26',
      reason = 'Manual sync'
    } = body;

    console.log(`🔄 Fee sync API called: ${action}`, { studentId, feeStructureId, newAmount });

    let result;

    switch (action) {
      case 'sync_transport':
        if (!studentId || newAmount === null) {
          return NextResponse.json(
            { success: false, error: 'studentId and newAmount are required for transport sync' },
            { status: 400 }
          );
        }
        result = await syncTransportFeesForStudent(studentId, newAmount, academicYear);
        break;

      case 'recalculate_status':
        if (!studentId) {
          return NextResponse.json(
            { success: false, error: 'studentId is required for status recalculation' },
            { status: 400 }
          );
        }
        result = await recalculateStudentFeeStatus(studentId, academicYear);
        break;

      case 'universal_sync':
        result = await universalFeeSync({
          studentId,
          feeStructureId,
          newAmount,
          academicYear,
          reason
        });
        break;

      case 'cleanup_orphaned':
        result = await cleanupOrphanedFees(academicYear);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Supported actions: sync_transport, recalculate_status, universal_sync, cleanup_orphaned' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error in fee sync API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync fees', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Get sync status and available actions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');

    if (studentId) {
      // Return sync status for specific student
      return NextResponse.json({
        success: true,
        data: {
          studentId,
          availableActions: [
            'sync_transport',
            'recalculate_status',
            'universal_sync'
          ],
          message: 'Use POST with action parameter to sync fees'
        }
      });
    }

    // Return general sync information
    return NextResponse.json({
      success: true,
      data: {
        availableActions: [
          'sync_transport',
          'recalculate_status', 
          'universal_sync',
          'cleanup_orphaned'
        ],
        description: {
          sync_transport: 'Sync transport fees for a specific student',
          recalculate_status: 'Recalculate fee statuses (pending/overdue/paid)',
          universal_sync: 'Universal fee sync with custom parameters',
          cleanup_orphaned: 'Remove orphaned fee records'
        },
        usage: {
          sync_transport: 'POST with { action: "sync_transport", studentId: number, newAmount: number }',
          recalculate_status: 'POST with { action: "recalculate_status", studentId: number }',
          universal_sync: 'POST with { action: "universal_sync", studentId?: number, feeStructureId?: number, newAmount?: number }',
          cleanup_orphaned: 'POST with { action: "cleanup_orphaned" }'
        }
      }
    });

  } catch (error: any) {
    console.error('Error in fee sync API GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get sync information' },
      { status: 500 }
    );
  }
}

