import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb, type RequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { ensureFeeOperationsSchema } from '@/lib/ensure-fee-operations-schema';
import { JOIN_CURRENT_ENROLLMENT_ON_STUDENT } from '@/lib/enrollment-sql';
import { actorName } from '@/lib/student-operations-utils';

export const OPENING_FEE_TYPE = 'Opening Outstanding';

export const FEE_OPS_SELECT =
  'rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white';

export async function requireFeeOps(request: NextRequest) {
  const auth = await getAuthenticatedDb(request);
  if (auth instanceof NextResponse) return auth;
  await ensureFeeSchema(auth.db);
  await ensureFeeOperationsSchema(auth.db);
  return auth;
}

export function feeOpsActor(user: { id: number; email?: string; full_name?: string }) {
  return { id: user.id, name: actorName(user) };
}

export const FEE_STUDENT_SELECT = `
  s.id AS student_id,
  s.first_name,
  s.last_name,
  s.admission_number,
  COALESCE(s.category, 'GEN') AS student_category,
  COALESCE(ce.class_id, s.class_id) AS class_id,
  COALESCE(ce.section_id, s.section_id) AS section_id,
  c.name AS class_name,
  sec.name AS section_name
`;

export const FEE_STUDENT_FROM = `
  FROM students s
  ${JOIN_CURRENT_ENROLLMENT_ON_STUDENT}
  LEFT JOIN classes c ON c.id = COALESCE(ce.class_id, s.class_id)
  LEFT JOIN sections sec ON sec.id = COALESCE(ce.section_id, s.section_id)
`;

export function outstandingOf(row: {
  amount_due?: unknown;
  amount_paid?: unknown;
  discount_amount?: unknown;
  late_fee_amount?: unknown;
  status?: string | null;
}): number {
  if (row.status === 'waived' || row.status === 'exempted') return 0;
  const due = parseFloat(String(row.amount_due ?? 0));
  const paid = parseFloat(String(row.amount_paid ?? 0));
  const discount = parseFloat(String(row.discount_amount ?? 0));
  const late = parseFloat(String(row.late_fee_amount ?? 0));
  const principal = Math.max(0, due - paid - discount);
  return principal > 0 ? principal + late : 0;
}

export function studentFeeStatus(amountDue: number, amountPaid: number, discount = 0) {
  const net = Math.max(0, amountDue - discount);
  if (amountPaid <= 0) return 'pending';
  if (amountPaid >= net) return 'paid';
  return 'partial';
}

export async function restoreStudentFee(
  db: RequestDb,
  studentFeeId: number,
  amount: number,
  lateFee = 0
) {
  const current = await db.query<{
    amount_due: string;
    amount_paid: string;
    discount_amount: string | null;
    late_fee_amount: string | null;
  }>(
    `SELECT amount_due, amount_paid, discount_amount, late_fee_amount
     FROM student_fees WHERE id = $1`,
    [studentFeeId]
  );
  const row = current.rows[0];
  if (!row) return;

  const nextPaid = Math.max(0, parseFloat(row.amount_paid || '0') - amount);
  const nextLate = Math.max(0, parseFloat(row.late_fee_amount || '0') - lateFee);
  const status = studentFeeStatus(
    parseFloat(row.amount_due || '0'),
    nextPaid,
    parseFloat(row.discount_amount || '0')
  );

  await db.query(
    `UPDATE student_fees
     SET amount_paid = $1,
         late_fee_amount = $2,
         status = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [nextPaid, nextLate, status, studentFeeId]
  );
}

export async function allocateToOldestDues(
  db: RequestDb,
  studentId: number,
  academicYear: string,
  amount: number
): Promise<number[]> {
  if (amount <= 0) return [];

  const dues = await db.query<{
    id: number;
    amount_due: string;
    amount_paid: string;
    discount_amount: string | null;
    late_fee_amount: string | null;
    status: string;
  }>(
    `SELECT sf.id, sf.amount_due, sf.amount_paid, sf.discount_amount, sf.late_fee_amount, sf.status
     FROM student_fees sf
     LEFT JOIN fee_structures fs ON fs.id = sf.fee_structure_id
     WHERE sf.student_id = $1
       AND sf.academic_year = $2
       AND sf.status IN ('pending', 'partial', 'overdue')
     ORDER BY sf.due_date ASC NULLS LAST, sf.id ASC`,
    [studentId, academicYear]
  );

  let remaining = amount;
  const allocated: number[] = [];

  for (const fee of dues.rows) {
    if (remaining <= 0) break;
    const due = outstandingOf(fee);
    if (due <= 0) continue;
    const apply = Math.min(remaining, due);
    const nextPaid = parseFloat(fee.amount_paid || '0') + apply;
    const status = studentFeeStatus(
      parseFloat(fee.amount_due || '0'),
      nextPaid,
      parseFloat(fee.discount_amount || '0')
    );
    await db.query(
      `UPDATE student_fees
       SET amount_paid = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [nextPaid, status, fee.id]
    );
    allocated.push(fee.id);
    remaining -= apply;
  }

  return allocated;
}

export async function ensureOpeningFeeStructure(
  db: RequestDb,
  academicYear: string
): Promise<number> {
  const existing = await db.query<{ id: number }>(
    `SELECT id FROM fee_structures
     WHERE fee_type = $1 AND academic_year = $2 AND class_id IS NULL
     ORDER BY is_active DESC, id ASC
     LIMIT 1`,
    [OPENING_FEE_TYPE, academicYear]
  );
  if (existing.rows[0]?.id) {
    await db.query(`UPDATE fee_structures SET is_active = true WHERE id = $1`, [
      existing.rows[0].id,
    ]);
    return existing.rows[0].id;
  }

  const created = await db.query<{ id: number }>(
    `INSERT INTO fee_structures (fee_type, amount, frequency, academic_year, is_active, description)
     VALUES ($1, 0, 'one_time', $2, true, 'Opening balance carry-forward')
     RETURNING id`,
    [OPENING_FEE_TYPE, academicYear]
  );
  return created.rows[0].id;
}

export async function applyCategoryRatesToStudents(
  db: RequestDb,
  academicYear: string,
  classId?: number
): Promise<number> {
  const params: unknown[] = [academicYear];
  let classFilter = '';
  if (classId) {
    params.push(classId);
    classFilter = `AND r.class_id = $2`;
  }

  const result = await db.query(
    `UPDATE student_fees sf
     SET amount_due = r.amount,
         status = CASE
           WHEN sf.amount_paid >= r.amount - COALESCE(sf.discount_amount, 0) THEN 'paid'
           WHEN sf.amount_paid > 0 THEN 'partial'
           ELSE 'pending'
         END,
         updated_at = CURRENT_TIMESTAMP
     FROM fee_category_rates r
     JOIN students s ON s.id = sf.student_id
     LEFT JOIN fee_structures fs ON fs.id = sf.fee_structure_id
     ${JOIN_CURRENT_ENROLLMENT_ON_STUDENT}
     WHERE r.academic_year = $1
       ${classFilter}
       AND r.class_id = COALESCE(ce.class_id, s.class_id)
       AND COALESCE(s.category, 'GEN') = r.student_category
       AND COALESCE(fs.fee_type, sf.remarks, '') = r.fee_type
       AND sf.academic_year = r.academic_year
       AND sf.status IN ('pending', 'partial', 'overdue')`,
    params
  );

  return result.rowCount ?? 0;
}
