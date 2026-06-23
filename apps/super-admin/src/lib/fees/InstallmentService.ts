import type { RequestDb } from '@/lib/request-db';
import { calculateDueDate } from '@/lib/fees/FeeDateService';
import { FEE_STATUSES } from '@/lib/fees/constants';
import { getPeriodCalendarMonths } from '@/lib/fees/AcademicYear';

export type InstallmentPlanInput = {
  feeStructureId: number;
  installmentCount: number;
};

/**
 * Splits one-time / annual fees into configurable installments.
 * Integrates with student_fees + fee_installments tables.
 */
export const InstallmentService = {
  async upsertPlan(db: RequestDb, input: InstallmentPlanInput): Promise<number> {
    const result = await db.query<{ id: number }>(
      `INSERT INTO fee_installment_plans (fee_structure_id, installment_count, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (fee_structure_id)
       DO UPDATE SET installment_count = EXCLUDED.installment_count, is_active = true
       RETURNING id`,
      [input.feeStructureId, input.installmentCount]
    );
    return result.rows[0].id;
  },

  async getPlan(db: RequestDb, feeStructureId: number) {
    const result = await db.query<{ installment_count: number }>(
      `SELECT installment_count FROM fee_installment_plans
       WHERE fee_structure_id = $1 AND is_active = true`,
      [feeStructureId]
    );
    return result.rows[0] ?? null;
  },

  /**
   * Create student_fees rows split into installments for eligible fee types.
   * Returns created student_fee ids.
   */
  async generateInstallmentsForStudent(
    db: RequestDb,
    params: {
      studentId: number;
      feeStructureId: number;
      academicYear: string;
      totalAmount: number;
      feeType: string;
      installmentCount?: number;
    }
  ): Promise<number[]> {
    const plan =
      params.installmentCount ??
      (await InstallmentService.getPlan(db, params.feeStructureId))?.installment_count;

    if (!plan || plan <= 1) {
      return [];
    }

    const installmentAmount = Math.round((params.totalAmount / plan) * 100) / 100;
    const remainder = Math.round((params.totalAmount - installmentAmount * plan) * 100) / 100;
    const calendarMonths = getPeriodCalendarMonths('yearly').slice(0, plan);
    const createdIds: number[] = [];

    for (let i = 0; i < plan; i++) {
      const calendarMonth = calendarMonths[i] ?? calendarMonths[calendarMonths.length - 1];
      const amount = i === plan - 1 ? installmentAmount + remainder : installmentAmount;
      const dueDate = calculateDueDate({ academicYear: params.academicYear, calendarMonth });

      const feeInsert = await db.query<{ id: number }>(
        `INSERT INTO student_fees (
          student_id, fee_structure_id, academic_year, amount_due,
          due_date, month, status, remarks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (student_id, fee_structure_id, academic_year, month)
        DO UPDATE SET amount_due = EXCLUDED.amount_due, updated_at = CURRENT_TIMESTAMP
        RETURNING id`,
        [
          params.studentId,
          params.feeStructureId,
          params.academicYear,
          amount,
          dueDate,
          calendarMonth,
          FEE_STATUSES.PENDING,
          `${params.feeType} installment ${i + 1}/${plan}`,
        ]
      );

      const studentFeeId = feeInsert.rows[0].id;
      createdIds.push(studentFeeId);

      await db.query(
        `INSERT INTO fee_installments (
          student_fee_id, installment_number, amount_due, due_date, status
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (student_fee_id, installment_number) DO NOTHING`,
        [studentFeeId, i + 1, amount, dueDate, FEE_STATUSES.PENDING]
      );
    }

    return createdIds;
  },
};
