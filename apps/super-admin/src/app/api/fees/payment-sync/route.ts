import { NextRequest, NextResponse } from 'next/server';
import { 
  syncPaymentWithFees, 
  universalPaymentReconciliation, 
  fixTransportFeePayments,
  autoPaymentReconciliation,
  isReconciliationNeeded
} from '@/features/fees/utils/paymentSync';

// POST - Universal payment synchronization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      action, 
      studentId, 
      amountPaid, 
      feeStructureIds, 
      months, 
      academicYear = '2025-26',
      paymentDate,
      paymentMethod = 'cash',
      reason = 'Manual sync'
    } = body;

    console.log(`🔄 Payment sync API called: ${action}`, { studentId, amountPaid, action });

    let result;

    switch (action) {
      case 'sync_payment':
        if (!studentId || !amountPaid) {
          return NextResponse.json(
            { success: false, error: 'studentId and amountPaid are required for payment sync' },
            { status: 400 }
          );
        }
        result = await syncPaymentWithFees({
          studentId,
          amountPaid,
          feeStructureIds,
          months,
          academicYear,
          paymentDate: paymentDate || new Date().toISOString().split('T')[0],
          paymentMethod
        });
        break;

      case 'universal_reconciliation':
        result = await universalPaymentReconciliation(academicYear);
        break;

      case 'fix_transport_payments':
        result = await fixTransportFeePayments(academicYear);
        break;

      case 'auto_reconciliation':
        result = await autoPaymentReconciliation(academicYear);
        break;

      case 'check_reconciliation_needed':
        result = await isReconciliationNeeded(academicYear);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Supported actions: sync_payment, universal_reconciliation, fix_transport_payments, auto_reconciliation, check_reconciliation_needed' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error in payment sync API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sync payments', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Get payment sync status and available actions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('student_id');
    const academicYear = searchParams.get('academic_year') || '2025-26';

    if (studentId) {
      // Return payment sync status for specific student
      return NextResponse.json({
        success: true,
        data: {
          studentId,
          academicYear,
          availableActions: [
            'sync_payment',
            'fix_transport_payments'
          ],
          message: 'Use POST with action parameter to sync payments'
        }
      });
    }

    // Return general payment sync information
    return NextResponse.json({
      success: true,
      data: {
        academicYear,
        availableActions: [
          'sync_payment',
          'universal_reconciliation', 
          'fix_transport_payments'
        ],
        description: {
          sync_payment: 'Sync a specific payment with fee records',
          universal_reconciliation: 'Reconcile all payment discrepancies across all students',
          fix_transport_payments: 'Fix transport fee payment tracking issues'
        },
        usage: {
          sync_payment: 'POST with { action: "sync_payment", studentId: number, amountPaid: number, feeStructureIds?: array, months?: array }',
          universal_reconciliation: 'POST with { action: "universal_reconciliation", academicYear?: string }',
          fix_transport_payments: 'POST with { action: "fix_transport_payments", academicYear?: string }'
        }
      }
    });

  } catch (error: any) {
    console.error('Error in payment sync API GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get payment sync information' },
      { status: 500 }
    );
  }
}
