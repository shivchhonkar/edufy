import type { RequestDb } from '@/lib/request-db';
import { ACTIVE_FEE_STATUSES_FOR_PAYMENT, FEE_STATUSES, PAYMENT_STATUSES } from '@/lib/fees/constants';

let reconciliationInProgress = false;

export type SyncPaymentInput = {
  studentId: number;
  amountPaid: number;
  academicYear: string;
  paymentDate: string;
  paymentMethod?: string;
  feeStructureIds?: number[];
  months?: number[];
};

export type ReconcileResult = {
  success: boolean;
  studentsProcessed: number;
  recordsFixed: number;
  transportRecordsFixed: number;
  message: string;
  error?: string;
};

async function distributePaymentToFees(
  db: RequestDb,
  studentId: number,
  academicYear: string,
  amountPaid: number,
  feeStructureIds: number[],
  months: number[]
): Promise<number> {
  let totalUpdated = 0;

  if (feeStructureIds.length > 0 && months.length > 0) {
    for (const feeStructureId of feeStructureIds) {
      for (const month of months) {
        const updateResult = await db.query(
          `UPDATE student_fees
           SET amount_paid = amount_due, status = $5, updated_at = CURRENT_TIMESTAMP
           WHERE student_id = $1 AND fee_structure_id = $2 AND month = $3
           AND academic_year = $4
           AND status = ANY($6::varchar[])`,
          [
            studentId,
            feeStructureId,
            month,
            academicYear,
            FEE_STATUSES.PAID,
            ACTIVE_FEE_STATUSES_FOR_PAYMENT,
          ]
        );
        totalUpdated += updateResult.rowCount ?? 0;
      }
    }
    return totalUpdated;
  }

  const pendingFees = await db.query<{
    id: number;
    amount_due: string;
    amount_paid: string;
  }>(
    `SELECT id, amount_due, amount_paid FROM student_fees
     WHERE student_id = $1 AND academic_year = $2
     AND status = ANY($3::varchar[])
     ORDER BY month, fee_structure_id`,
    [studentId, academicYear, ACTIVE_FEE_STATUSES_FOR_PAYMENT]
  );

  let remainingAmount = amountPaid;
  for (const fee of pendingFees.rows) {
    if (remainingAmount <= 0) break;
    const amountDue = parseFloat(fee.amount_due || '0');
    const amountAlreadyPaid = parseFloat(fee.amount_paid || '0');
    const amountNeeded = amountDue - amountAlreadyPaid;
    if (amountNeeded <= 0) continue;

    const amountToPay = Math.min(remainingAmount, amountNeeded);
    const newAmountPaid = amountAlreadyPaid + amountToPay;
    const newStatus =
      newAmountPaid >= amountDue ? FEE_STATUSES.PAID : FEE_STATUSES.PARTIAL;

    await db.query(
      `UPDATE student_fees SET amount_paid = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [newAmountPaid, newStatus, fee.id]
    );
    remainingAmount -= amountToPay;
    totalUpdated++;
  }

  return totalUpdated;
}

export const PaymentReconciliationService = {
  async syncPayment(db: RequestDb, input: SyncPaymentInput) {
    const {
      studentId,
      amountPaid,
      academicYear,
      paymentDate,
      paymentMethod = 'cash',
      feeStructureIds = [],
      months = [],
    } = input;

    return db.transaction(async (client) => {
      const txDb: RequestDb = {
        query: (text, params) => client.query(text, params),
        getClient: async () => client,
        transaction: async (cb) => cb(client),
      };

      const paymentResult = await txDb.query<{ id: number }>(
        `INSERT INTO fee_payments (
          student_id, amount_paid, payment_date, payment_method,
          academic_year, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id`,
        [studentId, amountPaid, paymentDate, paymentMethod, academicYear, PAYMENT_STATUSES.COMPLETED]
      );

      const updated = await distributePaymentToFees(
        txDb,
        studentId,
        academicYear,
        amountPaid,
        feeStructureIds,
        months
      );

      return {
        success: true,
        paymentId: paymentResult.rows[0].id,
        updatedFeeRecords: updated,
      };
    });
  },

  async detectMismatches(db: RequestDb, academicYear: string, studentId?: number) {
    const params: unknown[] = [academicYear];
    let studentFilter = '';
    if (studentId) {
      params.push(studentId);
      studentFilter = ' AND sp.student_id = $2';
    }

    const result = await db.query<{ student_id: number; total_payments: string; total_paid: string }>(
      `WITH student_payments AS (
        SELECT fp.student_id, SUM(fp.amount_paid) AS total_payments
        FROM fee_payments fp
        WHERE fp.academic_year = $1 AND fp.status = '${PAYMENT_STATUSES.COMPLETED}'
        GROUP BY fp.student_id
      ),
      student_fee_totals AS (
        SELECT sf.student_id, SUM(sf.amount_paid) AS total_paid
        FROM student_fees sf
        JOIN fee_structures fs ON sf.fee_structure_id = fs.id
        WHERE sf.academic_year = $1 AND fs.is_active = true
        GROUP BY sf.student_id
      )
      SELECT sp.student_id, sp.total_payments, sft.total_paid
      FROM student_payments sp
      JOIN student_fee_totals sft ON sp.student_id = sft.student_id
      WHERE sp.total_payments != sft.total_paid${studentFilter}`,
      params
    );

    return {
      count: result.rows.length,
      rows: result.rows,
      needed: result.rows.length > 0,
    };
  },

  async repairStudentFees(db: RequestDb, academicYear: string, studentId?: number): Promise<number> {
    const mismatches = await PaymentReconciliationService.detectMismatches(db, academicYear, studentId);
    let recordsFixed = 0;

    for (const row of mismatches.rows) {
      const totalPayments = parseFloat(row.total_payments);
      const totalPaid = parseFloat(row.total_paid);
      if (totalPayments <= totalPaid) continue;

      const pendingFees = await db.query<{
        id: number;
        amount_due: string;
        amount_paid: string;
      }>(
        `SELECT sf.id, sf.amount_due, sf.amount_paid
         FROM student_fees sf
         JOIN fee_structures fs ON sf.fee_structure_id = fs.id
         WHERE sf.student_id = $1 AND sf.academic_year = $2
         AND sf.status = ANY($3::varchar[])
         ORDER BY sf.month, fs.fee_type`,
        [row.student_id, academicYear, ACTIVE_FEE_STATUSES_FOR_PAYMENT]
      );

      let remaining = totalPayments - totalPaid;
      for (const fee of pendingFees.rows) {
        if (remaining <= 0) break;
        const due = parseFloat(fee.amount_due);
        const paid = parseFloat(fee.amount_paid);
        const needed = due - paid;
        if (needed <= 0) continue;

        const toPay = Math.min(remaining, needed);
        const newPaid = paid + toPay;
        const status = newPaid >= due ? FEE_STATUSES.PAID : FEE_STATUSES.PARTIAL;

        await db.query(
          `UPDATE student_fees SET amount_paid = $1, status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
          [newPaid, status, fee.id]
        );
        remaining -= toPay;
        recordsFixed++;
      }
    }

    return recordsFixed;
  },

  async repairTransportFees(db: RequestDb, academicYear: string): Promise<number> {
    const students = await db.query<{ student_id: number }>(
      `WITH student_totals AS (
        SELECT sf.student_id,
          SUM(CASE WHEN fs.fee_type ILIKE '%tuition%' THEN sf.amount_due ELSE 0 END) AS tuition_due,
          SUM(CASE WHEN fs.fee_type ILIKE '%tuition%' THEN sf.amount_paid ELSE 0 END) AS tuition_paid,
          SUM(CASE WHEN fs.fee_type ILIKE '%transport%' THEN sf.amount_due ELSE 0 END) AS transport_due,
          SUM(CASE WHEN fs.fee_type ILIKE '%transport%' THEN sf.amount_paid ELSE 0 END) AS transport_paid
        FROM student_fees sf
        JOIN fee_structures fs ON sf.fee_structure_id = fs.id
        WHERE sf.academic_year = $1 AND fs.is_active = true
        GROUP BY sf.student_id
      )
      SELECT student_id FROM student_totals
      WHERE transport_due > 0 AND transport_paid < transport_due
      AND tuition_paid >= tuition_due`,
      [academicYear]
    );

    let fixed = 0;
    for (const { student_id } of students.rows) {
      const updateResult = await db.query(
        `UPDATE student_fees SET amount_paid = amount_due, status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $1 AND academic_year = $2
         AND fee_structure_id IN (
           SELECT id FROM fee_structures WHERE fee_type ILIKE '%transport%' AND is_active = true
         )
         AND status = ANY($4::varchar[])`,
        [student_id, academicYear, FEE_STATUSES.PAID, ACTIVE_FEE_STATUSES_FOR_PAYMENT]
      );
      fixed += updateResult.rowCount ?? 0;
    }
    return fixed;
  },

  async reconcileAll(
    db: RequestDb,
    options: { academicYear: string; studentId?: number }
  ): Promise<ReconcileResult> {
    if (reconciliationInProgress) {
      return {
        success: true,
        studentsProcessed: 0,
        recordsFixed: 0,
        transportRecordsFixed: 0,
        message: 'Reconciliation already in progress',
      };
    }

    reconciliationInProgress = true;
    try {
      const transportRecordsFixed = await PaymentReconciliationService.repairTransportFees(
        db,
        options.academicYear
      );
      const recordsFixed = await PaymentReconciliationService.repairStudentFees(
        db,
        options.academicYear,
        options.studentId
      );
      const mismatches = await PaymentReconciliationService.detectMismatches(
        db,
        options.academicYear,
        options.studentId
      );

      return {
        success: true,
        studentsProcessed: mismatches.count,
        recordsFixed,
        transportRecordsFixed,
        message: 'Payment reconciliation completed',
      };
    } catch (error) {
      return {
        success: false,
        studentsProcessed: 0,
        recordsFixed: 0,
        transportRecordsFixed: 0,
        message: 'Payment reconciliation failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      reconciliationInProgress = false;
    }
  },

  isReconciliationNeeded: async (db: RequestDb, academicYear: string) => {
    return PaymentReconciliationService.detectMismatches(db, academicYear);
  },
};
