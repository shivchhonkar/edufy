import type { RequestDb } from '@/lib/request-db';
import { EXCLUDE_INACTIVE_OUTSTANDING_FEES } from '@/lib/fees/active-student-fee-filter';
import {
  ACADEMIC_MONTH_SEQUENCE,
  academicYearFilterValues,
  calendarYearForMonth,
  parseAcademicYear,
} from '@/lib/fees/AcademicYear';
import type { DashboardFeePoint } from '@/shared/types';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function fetchFeeCollectionSessionChart(
  db: RequestDb,
  academicYear: string,
): Promise<DashboardFeePoint[]> {
  const yearVariants = academicYearFilterValues(academicYear);
  const parsed = parseAcademicYear(academicYear);
  const rangeStart = `${parsed.startYear}-04-01`;
  const rangeEnd = `${parsed.endYear}-03-31`;

  const feesResult = await db.query<{ calendar_month: string; expected: string; due: string }>(
    `SELECT
      COALESCE(sf.month, EXTRACT(MONTH FROM sf.due_date)::int) AS calendar_month,
      COALESCE(SUM(sf.amount_due), 0)::text AS expected,
      COALESCE(SUM(GREATEST(sf.amount_due - sf.amount_paid, 0)), 0)::text AS due
     FROM student_fees sf
     JOIN students s ON sf.student_id = s.id
     LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
     WHERE s.status = 'active'
       AND sf.academic_year = ANY($1::text[])
       ${EXCLUDE_INACTIVE_OUTSTANDING_FEES}
     GROUP BY COALESCE(sf.month, EXTRACT(MONTH FROM sf.due_date)::int)`,
    [yearVariants],
  );

  const paymentsResult = await db.query<{ month_key: string; received: string }>(
    `SELECT TO_CHAR(payment_date, 'YYYY-MM') AS month_key,
      COALESCE(SUM(amount_paid), 0)::text AS received
     FROM fee_payments
     WHERE status = 'completed'
       AND payment_date >= $1::date
       AND payment_date <= $2::date
     GROUP BY TO_CHAR(payment_date, 'YYYY-MM')`,
    [rangeStart, rangeEnd],
  );

  const feesByMonth = new Map(
    feesResult.rows.map((row) => [
      parseInt(row.calendar_month, 10),
      { expected: parseFloat(row.expected), due: parseFloat(row.due) },
    ]),
  );
  const paymentsByKey = new Map(
    paymentsResult.rows.map((row) => [row.month_key, parseFloat(row.received)]),
  );

  return ACADEMIC_MONTH_SEQUENCE.map((calendarMonth) => {
    const year = calendarYearForMonth(parsed, calendarMonth);
    const monthKey = `${year}-${String(calendarMonth).padStart(2, '0')}`;
    const fees = feesByMonth.get(calendarMonth) ?? { expected: 0, due: 0 };
    const received = paymentsByKey.get(monthKey) ?? 0;

    return {
      month: monthKey,
      label: MONTH_SHORT[calendarMonth - 1],
      expected: fees.expected,
      received,
      due: fees.due,
      amount: received,
    };
  });
}
