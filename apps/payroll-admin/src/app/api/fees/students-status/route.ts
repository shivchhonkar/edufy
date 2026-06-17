import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureFeeSchema } from '@/lib/ensure-fee-schema';
import { resolveAcademicYear } from '@/lib/ensure-system-settings';

/** Bulk pending fee summary per student — used by /fees list page */
export async function GET(request: NextRequest) {
  try {
    const { db } = await getRequestDb(request);
    await ensureFeeSchema(db);

    const academicYear = await resolveAcademicYear(
      db,
      request.nextUrl.searchParams.get('academic_year')
    );

    const result = await db.query<{
      student_id: number;
      pending_amount: string;
      fee_count: string;
      pending_count: string;
    }>(
      `SELECT
        sf.student_id,
        COALESCE(SUM(GREATEST(sf.amount_due - sf.amount_paid, 0)), 0) AS pending_amount,
        COUNT(*)::text AS fee_count,
        COUNT(*) FILTER (
          WHERE sf.status IN ('pending', 'partial', 'overdue')
          AND (sf.amount_due - sf.amount_paid) > 0
        )::text AS pending_count
      FROM student_fees sf
      WHERE sf.academic_year = $1
      GROUP BY sf.student_id`,
      [academicYear]
    );

    const byStudent: Record<
      number,
      { pendingAmount: number; feeCount: number; pendingCount: number; paymentStatus: string }
    > = {};

    for (const row of result.rows) {
      const pendingAmount = parseFloat(row.pending_amount || '0');
      const feeCount = parseInt(row.fee_count || '0', 10);
      const pendingCount = parseInt(row.pending_count || '0', 10);

      byStudent[row.student_id] = {
        pendingAmount,
        feeCount,
        pendingCount,
        paymentStatus:
          pendingAmount > 0 || pendingCount > 0
            ? 'pending'
            : feeCount > 0
              ? 'completed'
              : 'not_assigned',
      };
    }

    return NextResponse.json({
      success: true,
      data: byStudent,
      academic_year: academicYear,
    });
  } catch (error) {
    console.error('Error fetching students fee status:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch fee status';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
