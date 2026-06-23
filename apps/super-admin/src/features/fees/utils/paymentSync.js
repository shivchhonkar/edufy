/**
 * @deprecated Use PaymentReconciliationService with tenant-scoped RequestDb.
 * Thin compatibility shim for legacy imports — delegates to PaymentReconciliationService.
 */

import pool from '@/lib/db';
import { PaymentReconciliationService } from '@/lib/fees/PaymentReconciliationService';

function poolAsRequestDb() {
  return {
    query: (text, params) => pool.query(text, params),
    getClient: async () => pool.connect(),
    transaction: async (callback) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

export async function syncPaymentWithFees(paymentData) {
  const db = poolAsRequestDb();
  try {
    const result = await PaymentReconciliationService.syncPayment(db, {
      studentId: paymentData.studentId,
      amountPaid: paymentData.amountPaid,
      academicYear: paymentData.academicYear ?? '2025-26',
      paymentDate: paymentData.paymentDate ?? new Date().toISOString().split('T')[0],
      paymentMethod: paymentData.paymentMethod ?? 'cash',
      feeStructureIds: paymentData.feeStructureIds ?? [],
      months: paymentData.months ?? [],
    });
    return {
      success: true,
      message: 'Payment synced successfully',
      paymentId: result.paymentId,
      updatedFeeRecords: result.updatedFeeRecords,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function universalPaymentReconciliation(academicYear = '2025-26') {
  const db = poolAsRequestDb();
  const result = await PaymentReconciliationService.reconcileAll(db, { academicYear });
  return {
    success: result.success,
    message: result.message,
    studentsProcessed: result.studentsProcessed,
    recordsFixed: result.recordsFixed,
    error: result.error,
  };
}

export async function fixTransportFeePayments(academicYear = '2025-26') {
  const db = poolAsRequestDb();
  const recordsFixed = await PaymentReconciliationService.repairTransportFees(db, academicYear);
    return {
      success: true,
    message: 'Transport fee payments fixed',
    recordsFixed,
  };
}

export async function autoPaymentReconciliation(academicYear = '2025-26') {
  const db = poolAsRequestDb();
  const result = await PaymentReconciliationService.reconcileAll(db, { academicYear });
    return {
    success: result.success,
    message: result.message,
    transportFix: { recordsFixed: result.transportRecordsFixed },
    reconciliation: {
      studentsProcessed: result.studentsProcessed,
      recordsFixed: result.recordsFixed,
    },
  };
}

export async function isReconciliationNeeded(academicYear = '2025-26') {
  const db = poolAsRequestDb();
  const check = await PaymentReconciliationService.isReconciliationNeeded(db, academicYear);
    return {
    needed: check.needed,
    count: check.count,
  };
}
