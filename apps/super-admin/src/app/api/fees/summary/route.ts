import { NextRequest, NextResponse } from 'next/server';
import { EXCLUDE_INACTIVE_OUTSTANDING_FEES } from '@/lib/fees/active-student-fee-filter';
import { FEE_STUDENT_FROM, requireFeeOps } from '@/lib/fee-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;
    const academicYear = request.nextUrl.searchParams.get('academic_year') || '';
    const classId = request.nextUrl.searchParams.get('class_id');

    const billedParams: unknown[] = [];
    const billedCond: string[] = [];
    if (academicYear) {
      billedParams.push(academicYear);
      billedCond.push(`sf.academic_year = $${billedParams.length}`);
    }
    if (classId) {
      billedParams.push(Number(classId));
      billedCond.push(`COALESCE(ce.class_id, s.class_id) = $${billedParams.length}`);
    }
    const billedWhere = `WHERE ${billedCond.length ? billedCond.join(' AND ') : '1=1'}`;

    const billed = await auth.db.query(
      `SELECT COALESCE(c.name, 'Unassigned') AS class_name,
              COALESCE(ce.class_id, s.class_id) AS class_id,
              COUNT(DISTINCT sf.student_id) AS student_count,
              SUM(sf.amount_due) AS billed,
              SUM(COALESCE(sf.amount_paid, 0)) AS collected,
              SUM(COALESCE(sf.discount_amount, 0)) AS discount,
              SUM(GREATEST(sf.amount_due - COALESCE(sf.amount_paid, 0) - COALESCE(sf.discount_amount, 0), 0)) AS outstanding
       FROM student_fees sf
       LEFT JOIN fee_structures fs ON fs.id = sf.fee_structure_id
       JOIN students s ON s.id = sf.student_id
       ${FEE_STUDENT_FROM.replace('FROM students s', '')}
       ${billedWhere}
       ${EXCLUDE_INACTIVE_OUTSTANDING_FEES}
       GROUP BY COALESCE(ce.class_id, s.class_id), c.name
       ORDER BY c.name`,
      billedParams
    );

    const totals = billed.rows.reduce(
      (acc, row) => ({
        billed: acc.billed + parseFloat(String(row.billed || 0)),
        collected: acc.collected + parseFloat(String(row.collected || 0)),
        discount: acc.discount + parseFloat(String(row.discount || 0)),
        outstanding: acc.outstanding + parseFloat(String(row.outstanding || 0)),
      }),
      { billed: 0, collected: 0, discount: 0, outstanding: 0 }
    );

    return NextResponse.json({ success: true, data: { rows: billed.rows, totals } });
  } catch (error) {
    console.error('Error loading fee summary:', error);
    return NextResponse.json({ success: false, error: 'Failed to load fee summary' }, { status: 500 });
  }
}
