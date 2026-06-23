import type { RequestDb } from '@/lib/request-db';
import { FeeGenerationService } from '@/lib/fees/FeeGenerationService';
import { PaymentReconciliationService } from '@/lib/fees/PaymentReconciliationService';
import { RepairService } from '@/lib/fees/RepairService';
import { getCurrentCalendarMonth } from '@/lib/fees/AcademicYear';

/**
 * Scheduler-ready entry points. Wire to cron / worker when automation is enabled.
 */
export const FeeScheduler = {
  async runMonthlyGeneration(db: RequestDb, academicYear: string) {
    const currentMonth = getCurrentCalendarMonth();
    const months = [currentMonth, currentMonth + 1, currentMonth + 2].filter((m) => m <= 12);

    return FeeGenerationService.generateSchoolFees(db, {
      academicYear,
      months,
      monthlyOnly: true,
      conflictStrategy: 'ignore',
    });
  },

  async runPaymentReconciliation(db: RequestDb, academicYear: string) {
    return PaymentReconciliationService.reconcileAll(db, { academicYear });
  },

  async runDataRepair(db: RequestDb, academicYear: string) {
    return RepairService.run(db, {
      academicYear,
      repairOrphans: true,
      repairTransportOrphans: true,
      reconcilePayments: true,
      recalculateStatuses: true,
    });
  },

  async runTransportSync(db: RequestDb, academicYear: string) {
    return FeeGenerationService.generateTransportFees(db, { academicYear });
  },
};
