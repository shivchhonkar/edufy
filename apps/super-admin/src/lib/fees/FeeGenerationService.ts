import type { RequestDb } from '@/lib/request-db';
import {
  academicYearVariants,
  academicYearFilterValues,
  getPeriodCalendarMonths,
  getTransportEligibleMonths,
  normalizeAcademicYear,
} from '@/lib/fees/AcademicYear';
import { calculateDueDate } from '@/lib/fees/FeeDateService';
import { ensureFeeExtensions } from '@/lib/fees/ensure-fee-extensions';
import { FeeStructureVersionService } from '@/lib/fees/FeeStructureVersionService';
import { INSTALLMENT_ELIGIBLE_FEE_TYPES } from '@/lib/fees/constants';
import { InstallmentService } from '@/lib/fees/InstallmentService';
import {
  dedupeStructuresForStudent,
  structurePreferenceOrderSql,
} from '@/lib/fees/fee-structure-dedup';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FeeStructureRow = {
  id: number;
  class_id: number | null;
  fee_type: string;
  amount: string | number;
  frequency: string;
  academic_year: string;
};

export type StudentRow = {
  id: number;
  class_id: number | null;
  first_name?: string;
  last_name?: string;
};

export type ConflictStrategy = 'ignore' | 'update_amount' | 'touch';

export type GenerationError = {
  student: string;
  error: string;
};

export type GenerateMonthsOptions = {
  academicYear: string;
  months: number[];
  studentIds?: number[];
  classId?: number;
  feeStructureIds?: number[];
  monthlyOnly?: boolean;
  conflictStrategy?: ConflictStrategy;
};

export type GenerateMonthsResult = {
  studentsProcessed: number;
  feesAssigned: number;
  months: number[];
  academicYear: string;
  errors: GenerationError[];
  createdFees: Record<string, unknown>[];
};

export type GenerateStudentFeesOptions = {
  academicYear: string;
  studentId: number;
  feeStructureIds?: number[];
  forceReassign?: boolean;
  conflictStrategy?: ConflictStrategy;
};

export type GenerateStudentFeesResult = {
  feesAssigned: number;
  feesSkipped: number;
};

export type GenerateClassFeesOptions = {
  academicYear: string;
  classId: number;
  studentIds?: number[];
  feeStructureIds?: number[];
  forceReassign?: boolean;
};

export type GenerateClassFeesResult = {
  studentsProcessed: number;
  totalFeesAssigned: number;
  feesSkipped: number;
  errors: GenerationError[];
};

export type GenerateSchoolFeesOptions = {
  academicYear: string;
  studentIds?: number[];
  classId?: number;
  feeStructureIds?: number[];
  forceReassign?: boolean;
  /** assign-missing: only students with zero fee rows for the year */
  onlyStudentsWithoutFees?: boolean;
  /** assign-bulk / assign-missing: limit to monthly structures + specific months */
  months?: number[];
  monthlyOnly?: boolean;
  conflictStrategy?: ConflictStrategy;
  /** Conflict handling for full-year (auto-assign) generation */
  fullYearConflictStrategy?: ConflictStrategy;
};

export type GenerateSchoolFeesResult = {
  studentsProcessed: number;
  totalFeesAssigned: number;
  feesSkipped: number;
  staleFeesRemoved?: number;
  errors: GenerationError[];
  months?: number[];
  academicYear: string;
};

export type TransportAssignmentInfo = {
  route_name: string;
  route_number: string | null;
  stop_name: string | null;
  transport_fee: number;
  start_date: string;
  end_date: string | null;
};

export type GenerateTransportFeesOptions = {
  academicYear: string;
  studentId?: number;
};

export type GenerateTransportFeesResult = {
  students_processed: number;
  created: number;
  updated: number;
  removed: number;
};

export type SyncTransportStudentResult = {
  created: number;
  updated: number;
  removed: number;
};

export type AssignmentStatusResult = {
  academicYear: string;
  totalStudents: number;
  studentsWithFees: number;
  activeFeeStructures: number;
  totalFeeRecords: number;
  assignmentComplete: boolean;
};

// ---------------------------------------------------------------------------
// Frequency helpers
// ---------------------------------------------------------------------------

type FrequencyPeriods = {
  periods: number;
  amountPerPeriod: number;
};

function periodsForFrequency(frequency: string, amount: number): FrequencyPeriods {
  switch (frequency) {
    case 'monthly':
      return { periods: 12, amountPerPeriod: amount };
    case 'quarterly':
      return { periods: 4, amountPerPeriod: amount / 4 };
    case 'half_yearly':
      return { periods: 2, amountPerPeriod: amount / 2 };
    case 'yearly':
    case 'one_time':
      return { periods: 1, amountPerPeriod: amount };
    default:
      return { periods: 12, amountPerPeriod: amount };
  }
}

// ---------------------------------------------------------------------------
// Internal DB helpers
// ---------------------------------------------------------------------------

async function fetchActiveStudents(
  db: RequestDb,
  filters: {
    studentIds?: number[];
    classId?: number;
    onlyWithoutFeesForYear?: string;
  }
): Promise<StudentRow[]> {
  let query = `
    SELECT s.id, s.class_id, s.first_name, s.last_name
    FROM students s
    WHERE s.status = 'active'
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.studentIds?.length) {
    query += ` AND s.id = ANY($${paramIndex++})`;
    params.push(filters.studentIds);
  }

  if (filters.classId != null) {
    query += ` AND s.class_id = $${paramIndex++}`;
    params.push(filters.classId);
  }

  if (filters.onlyWithoutFeesForYear) {
    query += ` AND NOT EXISTS (
      SELECT 1 FROM student_fees sf
      WHERE sf.student_id = s.id AND sf.academic_year = $${paramIndex++}
    )`;
    params.push(filters.onlyWithoutFeesForYear);
  }

  query += ` ORDER BY s.first_name, s.last_name`;

  const result = await db.query<StudentRow>(query, params);
  return result.rows;
}

async function fetchFeeStructures(
  db: RequestDb,
  options: {
    academicYear: string;
    feeStructureIds?: number[];
    monthlyOnly?: boolean;
    classId?: number | null;
    excludeTransport?: boolean;
  }
): Promise<FeeStructureRow[]> {
  const variants = academicYearVariants(options.academicYear);
  let query = `
    SELECT fs.id, fs.class_id, fs.fee_type, fs.amount, fs.frequency, fs.academic_year
    FROM fee_structures fs
    WHERE fs.is_active = true
    AND (fs.academic_year = $1 OR fs.academic_year = $2 OR fs.academic_year = $3)
  `;
  const params: unknown[] = [...variants];
  let paramIndex = 4;

  if (options.excludeTransport !== false) {
    query += ` AND fs.fee_type NOT ILIKE '%transport%'`;
  }

  if (options.monthlyOnly) {
    query += ` AND fs.frequency = 'monthly'`;
  }

  if (options.feeStructureIds?.length) {
    query += ` AND fs.id = ANY($${paramIndex++})`;
    params.push(options.feeStructureIds);
  }

  if (options.classId !== undefined) {
    query += ` AND (fs.class_id = $${paramIndex++} OR fs.class_id IS NULL)`;
    params.push(options.classId);
  }

  const result = await db.query<FeeStructureRow>(query, params);
  return result.rows;
}

/**
 * Remove pending/partial student fee rows that no longer match active class fee structures
 * (inactive structures, wrong class, or deleted structures).
 */
async function deactivateFeeTypes(
  db: RequestDb,
  options: { academicYear: string; feeTypes: string[] }
): Promise<{ structuresDeactivated: number; studentFeesRemoved: number }> {
  if (options.feeTypes.length === 0) {
    return { structuresDeactivated: 0, studentFeesRemoved: 0 };
  }

  const variants = academicYearVariants(options.academicYear);

  const deactivateResult = await db.query(
    `UPDATE fee_structures
     SET is_active = false, updated_at = NOW()
     WHERE is_active = true
     AND fee_type = ANY($1::text[])
     AND (academic_year = $2 OR academic_year = $3 OR academic_year = $4)`,
    [options.feeTypes, ...variants]
  );

  const deleteResult = await db.query(
    `DELETE FROM student_fees sf
     USING fee_structures fs
     WHERE sf.fee_structure_id = fs.id
     AND fs.is_active = false
     AND fs.fee_type = ANY($1::text[])
     AND (fs.academic_year = $2 OR fs.academic_year = $3 OR fs.academic_year = $4)
     AND sf.status IN ('pending', 'partial')`,
    [options.feeTypes, ...variants]
  );

  return {
    structuresDeactivated: deactivateResult.rowCount || 0,
    studentFeesRemoved: deleteResult.rowCount || 0,
  };
}

async function cleanupStaleFeeRecords(db: RequestDb, academicYear: string): Promise<number> {
  const variants = academicYearVariants(academicYear);
  const deleteResult = await db.query(
    `DELETE FROM student_fees sf
     WHERE sf.academic_year = $1
     AND sf.status IN ('pending', 'partial')
     AND (
       NOT EXISTS (
         SELECT 1 FROM fee_structures fs
         WHERE fs.id = sf.fee_structure_id
         AND fs.is_active = true
         AND (fs.academic_year = $2 OR fs.academic_year = $3 OR fs.academic_year = $4)
       )
       OR EXISTS (
         SELECT 1
         FROM fee_structures fs
         INNER JOIN students s ON s.id = sf.student_id
         WHERE fs.id = sf.fee_structure_id
         AND fs.class_id IS NOT NULL
         AND s.class_id IS DISTINCT FROM fs.class_id
       )
     )`,
    [academicYear, ...variants]
  );
  return deleteResult.rowCount || 0;
}

function structuresForStudent(
  structures: FeeStructureRow[],
  classId: number | null
): FeeStructureRow[] {
  return dedupeStructuresForStudent(structures, classId);
}

async function deactivateDuplicateFeeStructures(
  db: RequestDb,
  academicYear: string
): Promise<number> {
  const variants = academicYearVariants(academicYear);
  const deactivateResult = await db.query(
    `WITH ranked AS (
       SELECT
         fs.id,
         ROW_NUMBER() OVER (
           PARTITION BY LOWER(TRIM(fs.fee_type)), COALESCE(fs.class_id, 0)
           ORDER BY
             CASE fs.frequency
               WHEN 'one_time' THEN 5
               WHEN 'yearly' THEN 4
               WHEN 'half_yearly' THEN 3
               WHEN 'quarterly' THEN 2
               WHEN 'monthly' THEN 1
               ELSE 0
             END DESC,
             fs.id DESC
         ) AS rn
       FROM fee_structures fs
       WHERE fs.is_active = true
       AND fs.fee_type NOT ILIKE '%transport%'
       AND (fs.academic_year = $1 OR fs.academic_year = $2 OR fs.academic_year = $3)
     )
     UPDATE fee_structures fs
     SET is_active = false, updated_at = NOW()
     FROM ranked r
     WHERE fs.id = r.id AND r.rn > 1`,
    variants
  );

  if ((deactivateResult.rowCount ?? 0) > 0) {
    await db.query(
      `DELETE FROM student_fees sf
       USING fee_structures fs
       WHERE sf.fee_structure_id = fs.id
       AND fs.is_active = false
       AND (fs.academic_year = $1 OR fs.academic_year = $2 OR fs.academic_year = $3)
       AND sf.status IN ('pending', 'partial')`,
      variants
    );
  }

  return deactivateResult.rowCount || 0;
}

async function cleanupDuplicateStudentFeeRecords(
  db: RequestDb,
  academicYear: string
): Promise<number> {
  const deleteResult = await db.query(
    `WITH fee_rows AS (
       SELECT
         sf.id,
         ROW_NUMBER() OVER (
           PARTITION BY sf.student_id, sf.academic_year, sf.month, LOWER(TRIM(fs.fee_type))
           ORDER BY ${structurePreferenceOrderSql('fs', 's')}
         ) AS rn
       FROM student_fees sf
       JOIN fee_structures fs ON fs.id = sf.fee_structure_id
       JOIN students s ON s.id = sf.student_id
       WHERE sf.academic_year = $1
       AND sf.status IN ('pending', 'partial')
       AND fs.is_active = true
     )
     DELETE FROM student_fees sf
     WHERE sf.id IN (SELECT id FROM fee_rows WHERE rn > 1)`,
    [academicYear]
  );
  return deleteResult.rowCount || 0;
}

async function runFeeRecordMaintenance(
  db: RequestDb,
  academicYear: string
): Promise<{ staleRemoved: number; duplicatesRemoved: number; structuresDeactivated: number }> {
  const structuresDeactivated = await deactivateDuplicateFeeStructures(db, academicYear);
  const staleRemoved = await cleanupStaleFeeRecords(db, academicYear);
  const duplicatesRemoved = await cleanupDuplicateStudentFeeRecords(db, academicYear);
  return { staleRemoved, duplicatesRemoved, structuresDeactivated };
}

async function hasExistingFeeForStructure(
  db: RequestDb,
  studentId: number,
  feeStructureId: number,
  academicYear: string
): Promise<boolean> {
  const result = await db.query(
    `SELECT id FROM student_fees
     WHERE student_id = $1 AND fee_structure_id = $2 AND academic_year = $3
     LIMIT 1`,
    [studentId, feeStructureId, academicYear]
  );
  return result.rows.length > 0;
}

async function insertStudentFee(
  db: RequestDb,
  params: {
    studentId: number;
    feeStructureId: number;
    academicYear: string;
    amountDue: number;
    dueDate: string;
    month: number;
    conflictStrategy: ConflictStrategy;
    feeStructureVersionId?: number | null;
  }
): Promise<{ inserted: boolean; row?: Record<string, unknown> }> {
  const conflictClause =
    params.conflictStrategy === 'update_amount'
      ? `DO UPDATE SET amount_due = EXCLUDED.amount_due, updated_at = NOW()`
      : params.conflictStrategy === 'touch'
        ? `DO UPDATE SET updated_at = CURRENT_TIMESTAMP`
        : `DO NOTHING`;

  const returning = params.conflictStrategy === 'touch' ? ' RETURNING *' : '';

  const result = await db.query(
    `INSERT INTO student_fees (
      student_id, fee_structure_id, fee_structure_version_id, academic_year, amount_due,
      due_date, month, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW())
    ON CONFLICT (student_id, fee_structure_id, academic_year, month)
    ${conflictClause}${returning}`,
    [
      params.studentId,
      params.feeStructureId,
      params.feeStructureVersionId ?? null,
      params.academicYear,
      params.amountDue,
      params.dueDate,
      params.month,
    ]
  );

  if (params.conflictStrategy === 'touch') {
    return { inserted: result.rows.length > 0, row: result.rows[0] };
  }

  return { inserted: (result.rowCount ?? 0) > 0 };
}

async function assignStructureFullYear(
  db: RequestDb,
  student: StudentRow,
  feeStructure: FeeStructureRow,
  academicYear: string,
  options: { forceReassign?: boolean; conflictStrategy?: ConflictStrategy }
): Promise<{ assigned: number; skipped: number }> {
  if (!options.forceReassign) {
    const exists = await hasExistingFeeForStructure(db, student.id, feeStructure.id, academicYear);
    if (exists) {
      return { assigned: 0, skipped: 1 };
    }
  }

  const baseAmount = parseFloat(String(feeStructure.amount));
  const { periods, amountPerPeriod } = periodsForFrequency(feeStructure.frequency, baseAmount);
  const calendarMonths = getPeriodCalendarMonths(feeStructure.frequency).slice(0, periods);
  const conflictStrategy = options.conflictStrategy ?? 'update_amount';

  let versionId: number | null = null;
  try {
    versionId = await FeeStructureVersionService.ensureCurrentVersion(db, feeStructure.id);
  } catch {
    versionId = null;
  }

  const useInstallments =
    (feeStructure.frequency === 'yearly' || feeStructure.frequency === 'one_time') &&
    INSTALLMENT_ELIGIBLE_FEE_TYPES.some((t) =>
      feeStructure.fee_type.toLowerCase().includes(t.toLowerCase().split(' ')[0])
    );

  if (useInstallments) {
    const plan = await InstallmentService.getPlan(db, feeStructure.id);
    if (plan && plan.installment_count > 1) {
      await InstallmentService.generateInstallmentsForStudent(db, {
        studentId: student.id,
        feeStructureId: feeStructure.id,
        academicYear,
        totalAmount: baseAmount,
        feeType: feeStructure.fee_type,
        installmentCount: plan.installment_count,
      });
      return { assigned: plan.installment_count, skipped: 0 };
    }
  }

  let assigned = 0;

  for (const calendarMonth of calendarMonths) {
    if (feeStructure.frequency === 'one_time' && calendarMonth !== calendarMonths[0]) continue;

    const dueDate = calculateDueDate({ academicYear, calendarMonth });
    const { inserted } = await insertStudentFee(db, {
      studentId: student.id,
      feeStructureId: feeStructure.id,
      academicYear,
      amountDue: amountPerPeriod,
      dueDate,
      month: calendarMonth,
      conflictStrategy,
      feeStructureVersionId: versionId,
    });
    if (inserted) assigned++;
  }

  return { assigned, skipped: 0 };
}

async function getOrCreateTransportFeeStructure(
  db: RequestDb,
  academicYear: string
): Promise<number> {
  const normalizedYear = normalizeAcademicYear(academicYear);
  const yearFilter = academicYearFilterValues(normalizedYear);

  const existing = await db.query<{ id: number }>(
    `SELECT id FROM fee_structures
     WHERE fee_type ILIKE '%transport%'
     AND academic_year = ANY($1::text[])
     AND frequency = 'monthly'
     AND is_active = true
     ORDER BY id DESC
     LIMIT 1`,
    [yearFilter]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const created = await db.query<{ id: number }>(
    `INSERT INTO fee_structures (
      class_id, fee_type, amount, frequency, academic_year,
      description, is_active, late_fee_percentage, late_fee_days
    ) VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id`,
    [
      'Transport Fee',
      0,
      'monthly',
      normalizedYear,
      'Monthly transport fee (varies by route/stop)',
      true,
      0,
      7,
    ]
  );

  return created.rows[0].id;
}

export async function getActiveTransportAssignment(
  db: RequestDb,
  studentId: number
): Promise<TransportAssignmentInfo | null> {
  const result = await db.query<{
    transport_fee: string | number;
    start_date: string;
    end_date: string | null;
    route_name: string;
    route_number: string | null;
    stop_name: string | null;
  }>(
    `SELECT st.transport_fee, st.start_date, st.end_date,
            r.route_name, r.route_number, rs.stop_name
     FROM student_transport st
     JOIN routes r ON st.route_id = r.id
     LEFT JOIN route_stops rs ON st.stop_id = rs.id
     WHERE st.student_id = $1 AND st.status = 'active'
     ORDER BY st.start_date DESC, st.id DESC
     LIMIT 1`,
    [studentId]
  );

  if (!result.rows.length) return null;

  const row = result.rows[0];
  const fee = parseFloat(String(row.transport_fee || 0));
  if (fee <= 0) return null;

  return {
    route_name: row.route_name,
    route_number: row.route_number,
    stop_name: row.stop_name,
    transport_fee: fee,
    start_date: row.start_date,
    end_date: row.end_date,
  };
}

async function cleanupOrphanedTransportFees(db: RequestDb, academicYear: string): Promise<number> {
  const normalizedYear = normalizeAcademicYear(academicYear);
  const yearFilter = academicYearFilterValues(normalizedYear);
  const feeStructureId = await getOrCreateTransportFeeStructure(db, normalizedYear);
  const orphanDel = await db.query(
    `DELETE FROM student_fees sf
     WHERE sf.fee_structure_id = $1
     AND sf.academic_year = ANY($2::text[])
     AND sf.status IN ('pending', 'partial')
     AND NOT EXISTS (
       SELECT 1 FROM student_transport st
       WHERE st.student_id = sf.student_id AND st.status = 'active'
     )`,
    [feeStructureId, yearFilter]
  );
  return orphanDel.rowCount || 0;
}

async function syncTransportFeesForStudent(
  db: RequestDb,
  studentId: number,
  academicYear: string
): Promise<SyncTransportStudentResult> {
  const normalizedYear = normalizeAcademicYear(academicYear);
  const yearFilter = academicYearFilterValues(normalizedYear);
  const feeStructureId = await getOrCreateTransportFeeStructure(db, normalizedYear);
  const assignment = await getActiveTransportAssignment(db, studentId);

  if (!assignment) {
    const del = await db.query(
      `DELETE FROM student_fees
       WHERE student_id = $1 AND fee_structure_id = $2 AND academic_year = ANY($3::text[])
       AND status IN ('pending', 'partial')`,
      [studentId, feeStructureId, yearFilter]
    );
    return { created: 0, updated: 0, removed: del.rowCount || 0 };
  }

  const eligibleMonths = getTransportEligibleMonths(
    normalizedYear,
    assignment.start_date,
    assignment.end_date
  );

  let created = 0;
  let updated = 0;
  let removed = 0;

  const ineligibleDelete = await db.query(
    `DELETE FROM student_fees
     WHERE student_id = $1 AND fee_structure_id = $2 AND academic_year = ANY($3::text[])
     AND status IN ('pending', 'partial')
     AND NOT (month = ANY($4::int[]))`,
    [studentId, feeStructureId, yearFilter, eligibleMonths]
  );
  removed += ineligibleDelete.rowCount || 0;

  for (const calendarMonth of eligibleMonths) {
    const dueDate = calculateDueDate({ academicYear: normalizedYear, calendarMonth });
    const existing = await db.query<{ id: number; amount_due: string; status: string }>(
      `SELECT id, amount_due, status FROM student_fees
       WHERE student_id = $1 AND fee_structure_id = $2
       AND academic_year = ANY($3::text[]) AND month = $4`,
      [studentId, feeStructureId, yearFilter, calendarMonth]
    );

    if (existing.rows.length > 0) {
      const rec = existing.rows[0];
      if (
        parseFloat(rec.amount_due) !== assignment.transport_fee &&
        (rec.status === 'pending' || rec.status === 'partial')
      ) {
        await db.query(
          `UPDATE student_fees SET amount_due = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [assignment.transport_fee, rec.id]
        );
        updated++;
      }
    } else {
      const ins = await db.query(
        `INSERT INTO student_fees (
          student_id, fee_structure_id, academic_year, amount_due,
          due_date, month, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
        ON CONFLICT (student_id, fee_structure_id, academic_year, month) DO NOTHING
        RETURNING id`,
        [
          studentId,
          feeStructureId,
          normalizedYear,
          assignment.transport_fee,
          dueDate,
          calendarMonth,
        ]
      );
      if (ins.rows.length > 0) created++;
    }
  }

  return { created, updated, removed };
}

// ---------------------------------------------------------------------------
// Public service
// ---------------------------------------------------------------------------

export const FeeGenerationService = {
  async ensureSchema(db: RequestDb) {
    await ensureFeeExtensions(db);
  },

  /**
   * Generate monthly fee rows for specific calendar/academic months.
   * Used by assign-bulk, generate-months, and assign-missing (partial).
   */
  async generateMonths(db: RequestDb, options: GenerateMonthsOptions): Promise<GenerateMonthsResult> {
    const {
      academicYear,
      months,
      studentIds,
      classId,
      feeStructureIds,
      monthlyOnly = true,
      conflictStrategy = 'ignore',
    } = options;

    await runFeeRecordMaintenance(db, academicYear);

    const students = await fetchActiveStudents(db, { studentIds, classId });

    if (students.length === 0) {
      return {
        studentsProcessed: 0,
        feesAssigned: 0,
        months,
        academicYear,
        errors: [],
        createdFees: [],
      };
    }

    const allStructures = await fetchFeeStructures(db, {
      academicYear,
      feeStructureIds,
      monthlyOnly,
      excludeTransport: true,
    });

    let totalAssigned = 0;
    const errors: GenerationError[] = [];
    const createdFees: Record<string, unknown>[] = [];

    for (const student of students) {
      try {
        const applicable = structuresForStudent(allStructures, student.class_id);
        if (applicable.length === 0) continue;

        for (const month of months) {
          for (const feeStructure of applicable) {
            const dueDate = calculateDueDate({ academicYear, month: month });

            const { inserted, row } = await insertStudentFee(db, {
              studentId: student.id,
              feeStructureId: feeStructure.id,
              academicYear,
              amountDue: parseFloat(String(feeStructure.amount)),
              dueDate,
              month,
              conflictStrategy,
            });

            if (conflictStrategy === 'touch' && row) {
              createdFees.push(row);
            }
            if (inserted || row) totalAssigned++;
          }
        }
      } catch (studentError) {
        const name = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || String(student.id);
        errors.push({
          student: name,
          error: studentError instanceof Error ? studentError.message : 'Unknown error',
        });
      }
    }

    return {
      studentsProcessed: students.length,
      feesAssigned: totalAssigned,
      months,
      academicYear,
      errors,
      createdFees,
    };
  },

  /**
   * Full academic-year assignment for one student (all frequencies).
   * Mirrors auto-assign per-student logic.
   */
  async generateStudentFees(
    db: RequestDb,
    options: GenerateStudentFeesOptions
  ): Promise<GenerateStudentFeesResult> {
    const { academicYear, studentId, feeStructureIds, forceReassign = false, conflictStrategy = 'update_amount' } =
      options;

    const studentResult = await db.query<StudentRow>(
      `SELECT id, class_id, first_name, last_name FROM students WHERE id = $1`,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      throw new Error('Student not found');
    }

    const student = studentResult.rows[0];
    await runFeeRecordMaintenance(db, academicYear);
    const allStructures = await fetchFeeStructures(db, {
      academicYear,
      feeStructureIds,
      excludeTransport: true,
    });
    const applicable = structuresForStudent(allStructures, student.class_id);

    let feesAssigned = 0;
    let feesSkipped = 0;

    for (const feeStructure of applicable) {
      const result = await assignStructureFullYear(db, student, feeStructure, academicYear, {
        forceReassign,
        conflictStrategy,
      });
      feesAssigned += result.assigned;
      feesSkipped += result.skipped;
    }

    return { feesAssigned, feesSkipped };
  },

  /**
   * Full academic-year assignment for all active students in a class.
   */
  async generateClassFees(
    db: RequestDb,
    options: GenerateClassFeesOptions
  ): Promise<GenerateClassFeesResult> {
    const { academicYear, classId, studentIds, feeStructureIds, forceReassign = false } = options;

    const students = await fetchActiveStudents(db, { classId, studentIds });
    await runFeeRecordMaintenance(db, academicYear);
    const allStructures = await fetchFeeStructures(db, {
      academicYear,
      feeStructureIds,
      excludeTransport: true,
    });

    let totalFeesAssigned = 0;
    let feesSkipped = 0;
    const errors: GenerationError[] = [];

    for (const student of students) {
      try {
        const applicable = structuresForStudent(allStructures, student.class_id);
        for (const feeStructure of applicable) {
          const result = await assignStructureFullYear(db, student, feeStructure, academicYear, {
            forceReassign,
            conflictStrategy: forceReassign ? 'update_amount' : 'ignore',
          });
          totalFeesAssigned += result.assigned;
          feesSkipped += result.skipped;
        }
      } catch (studentError) {
        const name = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || String(student.id);
        errors.push({
          student: name,
          error: studentError instanceof Error ? studentError.message : 'Unknown error',
        });
      }
    }

    return {
      studentsProcessed: students.length,
      totalFeesAssigned,
      feesSkipped,
      errors,
    };
  },

  /**
   * School-wide fee generation.
   * - With `months` + `monthlyOnly`: assign-bulk / assign-missing style
   * - Without `months`: full auto-assign (all frequencies, academic year)
   */
  async generateSchoolFees(
    db: RequestDb,
    options: GenerateSchoolFeesOptions
  ): Promise<GenerateSchoolFeesResult> {
    const {
      academicYear,
      studentIds,
      classId,
      feeStructureIds,
      forceReassign = false,
      onlyStudentsWithoutFees = false,
      months,
      monthlyOnly,
      conflictStrategy = 'ignore',
      fullYearConflictStrategy = 'update_amount',
    } = options;

    const maintenance = await runFeeRecordMaintenance(db, academicYear);
    const staleFeesRemoved =
      maintenance.staleRemoved + maintenance.duplicatesRemoved + maintenance.structuresDeactivated;

    if (months?.length) {
      let targetStudentIds = studentIds;

      if (onlyStudentsWithoutFees) {
        const missingStudents = await fetchActiveStudents(db, {
          studentIds,
          classId,
          onlyWithoutFeesForYear: academicYear,
        });

        if (missingStudents.length === 0) {
          return {
            studentsProcessed: 0,
            totalFeesAssigned: 0,
            feesSkipped: 0,
            errors: [],
            months,
            academicYear,
          };
        }

        targetStudentIds = missingStudents.map((s) => s.id);
      }

      const monthResult = await FeeGenerationService.generateMonths(db, {
        academicYear,
        months,
        studentIds: targetStudentIds,
        classId: onlyStudentsWithoutFees ? undefined : classId,
        feeStructureIds,
        monthlyOnly: monthlyOnly ?? true,
        conflictStrategy,
      });

      const transportResult = await FeeGenerationService.generateTransportFees(db, {
        academicYear,
      });

      return {
        studentsProcessed: onlyStudentsWithoutFees
          ? (targetStudentIds?.length ?? 0)
          : monthResult.studentsProcessed,
        totalFeesAssigned: monthResult.feesAssigned + transportResult.created,
        feesSkipped: 0,
        staleFeesRemoved,
        transportFeesCreated: transportResult.created,
        transportFeesUpdated: transportResult.updated,
        errors: monthResult.errors,
        months,
        academicYear,
      };
    }

    const students = await fetchActiveStudents(db, {
      studentIds,
      classId,
      onlyWithoutFeesForYear: onlyStudentsWithoutFees ? academicYear : undefined,
    });

    if (students.length === 0) {
      return {
        studentsProcessed: 0,
        totalFeesAssigned: 0,
        feesSkipped: 0,
        staleFeesRemoved,
        errors: [],
        academicYear,
      };
    }

    const allStructures = await fetchFeeStructures(db, {
      academicYear,
      feeStructureIds,
      excludeTransport: true,
    });

    if (allStructures.length === 0) {
      throw new Error('No active fee structures found for the academic year');
    }

    let totalFeesAssigned = 0;
    let feesSkipped = 0;
    const errors: GenerationError[] = [];

    for (const student of students) {
      try {
        const applicable = structuresForStudent(allStructures, student.class_id);
        for (const feeStructure of applicable) {
          const result = await assignStructureFullYear(db, student, feeStructure, academicYear, {
            forceReassign,
            conflictStrategy: fullYearConflictStrategy,
          });
          totalFeesAssigned += result.assigned;
          feesSkipped += result.skipped;
        }
      } catch (studentError) {
        const name = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || String(student.id);
        errors.push({
          student: name,
          error: studentError instanceof Error ? studentError.message : 'Unknown error',
        });
      }
    }

    const transportResult = await FeeGenerationService.generateTransportFees(db, {
      academicYear,
    });

    return {
      studentsProcessed: students.length,
      totalFeesAssigned: totalFeesAssigned + transportResult.created,
      feesSkipped,
      staleFeesRemoved,
      transportFeesCreated: transportResult.created,
      transportFeesUpdated: transportResult.updated,
      errors,
      academicYear,
    };
  },

  /**
   * Assign a single newly-created fee structure to applicable students.
   * Used when a structure is created via setup.
   */
  async assignNewFeeStructure(
    db: RequestDb,
    params: {
      feeStructureId: number;
      classId: number | null;
      amount: number;
      frequency: string;
      academicYear: string;
    }
  ): Promise<number> {
    const feeStructure: FeeStructureRow = {
      id: params.feeStructureId,
      class_id: params.classId,
      fee_type: '',
      amount: params.amount,
      frequency: params.frequency,
      academic_year: params.academicYear,
    };

    const students = await fetchActiveStudents(db, {
      classId: params.classId ?? undefined,
    });

    let feesAssigned = 0;

    for (const student of students) {
      if (params.classId != null && student.class_id !== params.classId) continue;

      const result = await assignStructureFullYear(db, student, feeStructure, params.academicYear, {
        forceReassign: false,
        conflictStrategy: 'ignore',
      });
      feesAssigned += result.assigned;
    }

    return feesAssigned;
  },

  /**
   * Sync transport fee rows from student_transport assignments.
   */
  async generateTransportFees(
    db: RequestDb,
    options: GenerateTransportFeesOptions
  ): Promise<GenerateTransportFeesResult> {
    const normalizedYear = normalizeAcademicYear(options.academicYear);
    const { studentId } = options;

    let studentIds: number[];

    if (studentId) {
      studentIds = [studentId];
    } else {
      const rows = await db.query<{ student_id: number }>(
        `SELECT DISTINCT student_id FROM student_transport
         WHERE status = 'active' AND transport_fee IS NOT NULL AND transport_fee > 0`
      );
      studentIds = rows.rows.map((r) => r.student_id);
    }

    let created = 0;
    let updated = 0;
    let removed = 0;

    for (const sid of studentIds) {
      const result = await syncTransportFeesForStudent(db, sid, normalizedYear);
      created += result.created;
      updated += result.updated;
      removed += result.removed;
    }

    removed += await cleanupOrphanedTransportFees(db, normalizedYear);

    return {
      students_processed: studentIds.length,
      created,
      updated,
      removed,
    };
  },

  /** Sync transport fees for a single student (used on assignment changes). */
  syncTransportFeesForStudent,

  /** Remove transport fees for students without active transport. */
  cleanupOrphanedTransportFees,

  /** Remove stale/duplicate student_fees and deactivate duplicate fee structures. */
  async cleanupOrphanedFeeRecords(db: RequestDb, academicYear: string): Promise<number> {
    const result = await runFeeRecordMaintenance(db, academicYear);
    return result.staleRemoved + result.duplicatesRemoved;
  },

  /** Full maintenance: dedupe structures, remove stale and duplicate student fees. */
  runFeeRecordMaintenance,

  async cleanupStaleFeeRecords(db: RequestDb, academicYear: string): Promise<number> {
    const result = await runFeeRecordMaintenance(db, academicYear);
    return result.staleRemoved + result.duplicatesRemoved;
  },

  deactivateFeeTypes,

  getOrCreateTransportFeeStructure,

  /** Read active transport assignment for a student. */
  getActiveTransportAssignment,

  /** Assignment status summary for operations dashboard. */
  async getAssignmentStatus(db: RequestDb, academicYear: string): Promise<AssignmentStatusResult> {
    const variants = academicYearVariants(academicYear);

    const statusResult = await db.query<{
      total_students: string;
      students_with_fees: string;
      active_fee_structures: string;
      total_fee_records: string;
    }>(
      `WITH active_students AS (
        SELECT s.id, s.class_id, COUNT(*) as student_count
        FROM students s
        WHERE s.status = 'active'
        GROUP BY s.id, s.class_id
      ),
      assigned_fees AS (
        SELECT sf.student_id, COUNT(*) as fee_count
        FROM student_fees sf
        WHERE sf.academic_year = $1
        GROUP BY sf.student_id
      ),
      active_fee_structures AS (
        SELECT COUNT(*) as structure_count
        FROM fee_structures fs
        WHERE fs.is_active = true
        AND (fs.academic_year = $1 OR fs.academic_year = $2 OR fs.academic_year = $3)
      )
      SELECT
        (SELECT COUNT(*) FROM active_students) as total_students,
        (SELECT COUNT(*) FROM assigned_fees) as students_with_fees,
        (SELECT structure_count FROM active_fee_structures) as active_fee_structures,
        COALESCE(SUM(af.fee_count), 0) as total_fee_records
      FROM active_students ast
      LEFT JOIN assigned_fees af ON ast.id = af.student_id`,
      variants
    );

    const status = statusResult.rows[0];
    const totalStudents = parseInt(status.total_students, 10);
    const studentsWithFees = parseInt(status.students_with_fees, 10);

    return {
      academicYear,
      totalStudents,
      studentsWithFees,
      activeFeeStructures: parseInt(status.active_fee_structures, 10),
      totalFeeRecords: parseInt(status.total_fee_records, 10),
      assignmentComplete: totalStudents === studentsWithFees,
    };
  },
};
