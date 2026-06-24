import type { RequestDb } from '@/lib/request-db';
import { FeeGenerationService } from '@/lib/fees/FeeGenerationService';
import { PaymentReconciliationService } from '@/lib/fees/PaymentReconciliationService';

export type RepairOptions = {
  academicYear: string;
  studentId?: number;
  repairOrphans?: boolean;
  repairTransportOrphans?: boolean;
  reconcilePayments?: boolean;
  recalculateStatuses?: boolean;
};

export type RepairResult = {
  orphanedFeesRemoved: number;
  transportOrphansRemoved: number;
  transportFeesCreated: number;
  transportFeesUpdated: number;
  reconciliation?: Awaited<ReturnType<typeof PaymentReconciliationService.reconcileAll>>;
  statusesRecalculated: number;
};

/**
 * Explicit repair operations — never invoked from GET handlers.
 * Use Operations page, POST /api/fees/repair, or scheduled jobs.
 */
export const RepairService = {
  async run(db: RequestDb, options: RepairOptions): Promise<RepairResult> {
    const {
      academicYear,
      studentId,
      repairOrphans = true,
      repairTransportOrphans = true,
      reconcilePayments = true,
      recalculateStatuses = true,
    } = options;

    let orphanedFeesRemoved = 0;
    let transportOrphansRemoved = 0;
    let transportFeesCreated = 0;
    let transportFeesUpdated = 0;
    let statusesRecalculated = 0;
    let reconciliation: RepairResult['reconciliation'];

    if (repairOrphans) {
      orphanedFeesRemoved = await FeeGenerationService.cleanupOrphanedFeeRecords(db, academicYear);
    }

    if (repairTransportOrphans) {
      transportOrphansRemoved = await FeeGenerationService.cleanupOrphanedTransportFees(
        db,
        academicYear
      );
      const transportSync = await FeeGenerationService.generateTransportFees(db, {
        academicYear,
        studentId,
      });
      transportFeesCreated = transportSync.created;
      transportFeesUpdated = transportSync.updated;
    }

    if (reconcilePayments) {
      reconciliation = await PaymentReconciliationService.reconcileAll(db, {
        academicYear,
        studentId,
      });
    }

    if (recalculateStatuses && studentId) {
      const { recalculateStudentFeeStatuses } = await import('@/lib/fees/LateFeePolicyEngine');
      statusesRecalculated = await recalculateStudentFeeStatuses(db, studentId, academicYear);
    } else if (recalculateStatuses) {
      const students = await db.query<{ id: number }>(
        `SELECT DISTINCT student_id AS id FROM student_fees WHERE academic_year = $1`,
        [academicYear]
      );
      const { recalculateStudentFeeStatuses } = await import('@/lib/fees/LateFeePolicyEngine');
      for (const row of students.rows) {
        statusesRecalculated += await recalculateStudentFeeStatuses(db, row.id, academicYear);
      }
    }

    return {
      orphanedFeesRemoved,
      transportOrphansRemoved,
      transportFeesCreated,
      transportFeesUpdated,
      reconciliation,
      statusesRecalculated,
    };
  },
};
