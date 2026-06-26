import type { RequestDb } from '@/lib/request-db';
import { EXCLUDE_INACTIVE_OUTSTANDING_FEES } from '@/lib/fees/active-student-fee-filter';
import { academicYearFilterValues } from '@/lib/fees/AcademicYear';
import type { DashboardFeeRevenueSummary } from '@/shared/types';

export async function fetchFeeRevenueSummary(
  db: RequestDb,
  academicYear: string,
): Promise<DashboardFeeRevenueSummary> {
  const yearVariants = academicYearFilterValues(academicYear);

  const result = await db.query<{
    total_due: string;
    total_received: string;
    total_discount: string;
  }>(
    `SELECT
      COALESCE(SUM(
        CASE WHEN sf.amount_due > sf.amount_paid
          THEN sf.amount_due - sf.amount_paid + COALESCE(sf.late_fee_amount, 0)
          ELSE 0 END
      ), 0)::text AS total_due,
      COALESCE(SUM(sf.amount_paid), 0)::text AS total_received,
      COALESCE(SUM(sf.discount_amount), 0)::text AS total_discount
     FROM student_fees sf
     JOIN students s ON sf.student_id = s.id
     LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
     WHERE s.status = 'active'
       AND sf.academic_year = ANY($1::text[])
       ${EXCLUDE_INACTIVE_OUTSTANDING_FEES}`,
    [yearVariants],
  );

  const row = result.rows[0];
  const totalDue = parseFloat(row?.total_due || '0');
  const totalReceived = parseFloat(row?.total_received || '0');
  const totalDiscount = parseFloat(row?.total_discount || '0');
  const total = totalDue + totalReceived + totalDiscount;

  const pct = (value: number) => (total > 0 ? Math.round((value / total) * 1000) / 10 : 0);

  return {
    total,
    total_due: totalDue,
    total_received: totalReceived,
    total_discount: totalDiscount,
    due_percent: pct(totalDue),
    received_percent: pct(totalReceived),
    discount_percent: pct(totalDiscount),
  };
}
