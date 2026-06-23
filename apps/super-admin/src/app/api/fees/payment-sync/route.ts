import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';
import { PaymentReconciliationService } from '@/lib/fees/PaymentReconciliationService';

export async function POST(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);

    const body = await request.json();
    const {
      action,
      studentId,
      amountPaid,
      feeStructureIds,
      months,
      academicYear,
      paymentDate,
      paymentMethod = 'cash',
    } = body;

    const year = await resolveAcademicYear(db, academicYear);

    let result;

    switch (action) {
      case 'sync_payment': {
        if (!studentId || !amountPaid) {
          return NextResponse.json(
            { success: false, error: 'studentId and amountPaid are required for payment sync' },
            { status: 400 }
          );
        }
        result = await PaymentReconciliationService.syncPayment(db, {
          studentId,
          amountPaid,
          feeStructureIds: feeStructureIds ?? [],
          months: months ?? [],
          academicYear: year,
          paymentDate: paymentDate || new Date().toISOString().split('T')[0],
          paymentMethod,
        });
        break;
      }

      case 'universal_reconciliation':
      case 'auto_reconciliation':
        result = await PaymentReconciliationService.reconcileAll(db, { academicYear: year });
        break;

      case 'fix_transport_payments':
        result = {
          success: true,
          recordsFixed: await PaymentReconciliationService.repairTransportFees(db, year),
        };
        break;

      case 'check_reconciliation_needed':
        result = await PaymentReconciliationService.isReconciliationNeeded(db, year);
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error:
              'Invalid action. Supported: sync_payment, universal_reconciliation, fix_transport_payments, auto_reconciliation, check_reconciliation_needed',
          },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error in payment sync API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync payments',
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
    const academicYear = searchParams.get('academic_year') || '2025-26';

    if (studentId) {
      return NextResponse.json({
        success: true,
        data: {
          studentId,
          academicYear,
          availableActions: ['sync_payment', 'fix_transport_payments'],
          message: 'Use POST with action parameter to sync payments',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        academicYear,
        availableActions: [
          'sync_payment',
          'universal_reconciliation',
          'fix_transport_payments',
          'auto_reconciliation',
          'check_reconciliation_needed',
        ],
        description: {
          sync_payment: 'Sync a specific payment with fee records',
          universal_reconciliation: 'Reconcile all payment discrepancies across all students',
          fix_transport_payments: 'Fix transport fee payment tracking issues',
        },
      },
    });
  } catch (error: unknown) {
    console.error('Error in payment sync API GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get payment sync information' },
      { status: 500 }
    );
  }
}
