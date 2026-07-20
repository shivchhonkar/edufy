import type { RequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { generateNextReceiptNumber } from '@/lib/fees/ReceiptNumberService';

type FeeRow = {
  id: number;
  month?: number | null;
  due_date?: string | null;
  amount_due?: string | number | null;
  amount_paid?: string | number | null;
  late_fee_amount?: string | number | null;
  status?: string | null;
  fee_type?: string | null;
  category_name?: string | null;
  academic_year?: string | null;
};

function parseAmount(value: unknown): number {
  const amount = parseFloat(String(value ?? 0));
  return Number.isFinite(amount) ? amount : 0;
}

export function getFeeOutstanding(fee: FeeRow): number {
  if (fee.status === 'waived' || fee.status === 'exempted') {
    return 0;
  }

  const principal = Math.max(0, parseAmount(fee.amount_due) - parseAmount(fee.amount_paid));
  const lateFee = principal > 0 ? parseAmount(fee.late_fee_amount) : 0;
  return principal + lateFee;
}

export async function loadStudentFeesForPayment(
  db: RequestDb,
  studentId: number,
  feeIds: number[],
  academicYear: string,
): Promise<FeeRow[]> {
  await ensureFeeSchema(db);

  const result = await db.query(
    `SELECT sf.*, fs.fee_type, fc.name AS category_name
     FROM student_fees sf
     LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
     LEFT JOIN fee_categories fc ON fs.category_id = fc.id
     WHERE sf.student_id = $1
       AND sf.academic_year = $2
       AND sf.id = ANY($3::int[])`,
    [studentId, academicYear, feeIds],
  );

  return result.rows as FeeRow[];
}

export function calculatePayableTotal(fees: FeeRow[]): number {
  return fees.reduce((sum, fee) => sum + getFeeOutstanding(fee), 0);
}

export async function loadParentPayerDetails(db: RequestDb, studentId: number) {
  const result = await db.query<{
    parent_name: string | null;
    parent_phone: string | null;
    parent_email: string | null;
    first_name: string | null;
    last_name: string | null;
    school_name: string | null;
  }>(
    `SELECT s.parent_name, s.parent_phone, s.parent_email, s.first_name, s.last_name,
            (
              SELECT school_name
              FROM system_settings
              ORDER BY id DESC
              LIMIT 1
            ) AS school_name
     FROM students s
     WHERE s.id = $1`,
    [studentId],
  );

  const row = result.rows[0];
  const studentName = [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim();

  return {
    name: row?.parent_name?.trim() || studentName || 'Parent',
    email: row?.parent_email?.trim() || '',
    phone: row?.parent_phone?.trim() || '',
    schoolName: row?.school_name?.trim() || 'School',
  };
}

export async function applyOnlineFeePayment(
  db: RequestDb,
  params: {
    studentId: number;
    academicYear: string;
    feeIds: number[];
    transactionId: string;
    payerName?: string | null;
    remarks?: string | null;
  },
) {
  const fees = await loadStudentFeesForPayment(
    db,
    params.studentId,
    params.feeIds,
    params.academicYear,
  );

  if (fees.length !== params.feeIds.length) {
    throw new Error('One or more selected fee records are invalid');
  }

  const payableFees = fees.filter((fee) => getFeeOutstanding(fee) > 0);
  if (!payableFees.length) {
    throw new Error('Selected fees are already paid');
  }

  const totalAmount = calculatePayableTotal(payableFees);
  const paymentDate = new Date().toISOString().split('T')[0];
  const receiptNumber = await generateNextReceiptNumber(db, params.academicYear);

  await db.transaction(async (client) => {
    await client.query(
      `INSERT INTO fee_payments (
         student_id, amount_paid, payment_date, payment_method, transaction_id,
         receipt_number, status, remarks, created_by, academic_year
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        params.studentId,
        totalAmount,
        paymentDate,
        'online',
        params.transactionId,
        receiptNumber,
        'completed',
        params.remarks || 'Online fee payment via Razorpay',
        params.payerName || 'Parent Portal',
        params.academicYear,
      ],
    );

    for (const fee of payableFees) {
      const outstanding = getFeeOutstanding(fee);
      const newAmountPaid = parseAmount(fee.amount_paid) + outstanding;
      const amountDue = parseAmount(fee.amount_due);
      const newStatus = newAmountPaid >= amountDue ? 'paid' : 'partial';

      await client.query(
        `UPDATE student_fees
         SET amount_paid = $1, status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [newAmountPaid, newStatus, fee.id],
      );
    }
  });

  return {
    receiptNumber,
    totalAmount,
    feeCount: payableFees.length,
  };
}
