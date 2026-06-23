import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { FeeGenerationService } from '@/lib/fees/FeeGenerationService';
import { recalculateStudentFeeStatuses } from '@/lib/fees/LateFeePolicyEngine';

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    const body = await request.json();
    const {
      action,
      studentId,
      feeStructureId,
      newAmount,
      academicYear = '2025-26',
      reason = 'Manual sync',
    } = body;

    console.log(`🔄 Fee sync API called: ${action}`, { studentId, feeStructureId, newAmount });

    let result;

    switch (action) {
      case 'sync_transport': {
        if (!studentId) {
          return NextResponse.json(
            { success: false, error: 'studentId is required for transport sync' },
            { status: 400 }
          );
        }
        const syncResult = await FeeGenerationService.syncTransportFeesForStudent(
          db,
          studentId,
          academicYear
        );
        result = {
          success: true,
          message: `Transport fees synced for student ${studentId}`,
          ...syncResult,
        };
        break;
      }

      case 'recalculate_status':
        if (!studentId) {
          return NextResponse.json(
            { success: false, error: 'studentId is required for status recalculation' },
            { status: 400 }
          );
        }
        {
          const updatedCount = await recalculateStudentFeeStatuses(db, studentId, academicYear);
          result = {
            success: true,
            message: `Fee statuses recalculated for student ${studentId}`,
            updatedCount,
          };
        }
        break;

      case 'universal_sync': {
        let updatedCount = 0;
        if (studentId && feeStructureId && newAmount !== null && newAmount !== undefined) {
          const updateResult = await db.query(
            `UPDATE student_fees
             SET amount_due = $1, updated_at = CURRENT_TIMESTAMP
             WHERE student_id = $2
             AND fee_structure_id = $3
             AND status IN ('pending', 'partial', 'overdue')
             AND academic_year = $4`,
            [newAmount, studentId, feeStructureId, academicYear]
          );
          updatedCount = updateResult.rowCount ?? 0;
        }
        if (studentId) {
          updatedCount += await recalculateStudentFeeStatuses(db, studentId, academicYear);
        }
        result = {
          success: true,
          message: `Universal fee sync completed: ${reason}`,
          updatedCount,
        };
        break;
      }

      case 'cleanup_orphaned': {
        const deletedNull = await FeeGenerationService.cleanupOrphanedFeeRecords(db, academicYear);
        const transportRemoved = await FeeGenerationService.cleanupOrphanedTransportFees(
          db,
          academicYear
        );
        result = {
          success: true,
          message: `Cleaned up ${deletedNull + transportRemoved} orphaned fee records`,
          deletedCount: deletedNull + transportRemoved,
        };
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid action. Supported actions: sync_transport, recalculate_status, universal_sync, cleanup_orphaned',
          },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in fee sync API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync fees',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');

    if (studentId) {
      return NextResponse.json({
        success: true,
        data: {
          studentId,
          availableActions: ['sync_transport', 'recalculate_status', 'universal_sync'],
          message: 'Use POST with action parameter to sync fees',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        availableActions: [
          'sync_transport',
          'recalculate_status',
          'universal_sync',
          'cleanup_orphaned',
        ],
        description: {
          sync_transport: 'Sync transport fees for a specific student',
          recalculate_status: 'Recalculate fee statuses (pending/overdue/paid)',
          universal_sync: 'Universal fee sync with custom parameters',
          cleanup_orphaned: 'Remove orphaned fee records',
        },
        usage: {
          sync_transport: 'POST with { action: "sync_transport", studentId: number }',
          recalculate_status: 'POST with { action: "recalculate_status", studentId: number }',
          universal_sync:
            'POST with { action: "universal_sync", studentId?: number, feeStructureId?: number, newAmount?: number }',
          cleanup_orphaned: 'POST with { action: "cleanup_orphaned" }',
        },
      },
    });
  } catch (error: unknown) {
    console.error('Error in fee sync API GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get sync information' },
      { status: 500 }
    );
  }
}
