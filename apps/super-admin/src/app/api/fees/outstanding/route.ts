import { NextRequest, NextResponse } from 'next/server';
import { EXCLUDE_INACTIVE_OUTSTANDING_FEES } from '@/lib/fees/active-student-fee-filter';
import { FEE_STUDENT_FROM, FEE_STUDENT_SELECT, requireFeeOps } from '@/lib/fee-operations-utils';

const DUE_SQL = `GREATEST(
  sf.amount_due - COALESCE(sf.amount_paid, 0) - COALESCE(sf.discount_amount, 0),
  0
) + CASE
  WHEN GREATEST(sf.amount_due - COALESCE(sf.amount_paid, 0) - COALESCE(sf.discount_amount, 0), 0) > 0
  THEN COALESCE(sf.late_fee_amount, 0) ELSE 0
END`;

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;

    const view = request.nextUrl.searchParams.get('view') || 'class';
    const academicYear = request.nextUrl.searchParams.get('academic_year') || '';
    const classId = request.nextUrl.searchParams.get('class_id');

    const params: unknown[] = [];
    const conditions = [
      `sf.status IN ('pending', 'partial', 'overdue')`,
      `${DUE_SQL} > 0`,
    ];
    if (academicYear) {
      params.push(academicYear);
      conditions.push(`sf.academic_year = $${params.length}`);
    }
    if (classId) {
      params.push(Number(classId));
      conditions.push(`COALESCE(ce.class_id, s.class_id) = $${params.length}`);
    }

    const where = `WHERE ${conditions.join(' AND ')} ${EXCLUDE_INACTIVE_OUTSTANDING_FEES}`;

    if (view === 'head') {
      const result = await auth.db.query(
        `SELECT COALESCE(fs.fee_type, sf.remarks, 'Other') AS fee_type,
                COUNT(DISTINCT sf.student_id) AS student_count,
                SUM(${DUE_SQL}) AS outstanding
         FROM student_fees sf
         LEFT JOIN fee_structures fs ON fs.id = sf.fee_structure_id
         JOIN students s ON s.id = sf.student_id
         ${FEE_STUDENT_FROM.replace('FROM students s', '')}
         ${where}
         GROUP BY COALESCE(fs.fee_type, sf.remarks, 'Other')
         ORDER BY outstanding DESC`,
        params
      );
      return NextResponse.json({ success: true, data: result.rows });
    }

    if (view === 'monthly') {
      const result = await auth.db.query(
        `SELECT sf.month,
                COUNT(DISTINCT sf.student_id) AS student_count,
                SUM(${DUE_SQL}) AS outstanding
         FROM student_fees sf
         LEFT JOIN fee_structures fs ON fs.id = sf.fee_structure_id
         JOIN students s ON s.id = sf.student_id
         ${FEE_STUDENT_FROM.replace('FROM students s', '')}
         ${where}
         GROUP BY sf.month
         ORDER BY sf.month NULLS LAST`,
        params
      );
      return NextResponse.json({ success: true, data: result.rows });
    }

    if (view === 'installment') {
      const result = await auth.db.query(
        `SELECT fi.*, ${FEE_STUDENT_SELECT}, COALESCE(fs.fee_type, 'Installment') AS fee_type,
                GREATEST(fi.amount_due - COALESCE(fi.amount_paid, 0), 0) AS outstanding
         FROM fee_installments fi
         JOIN student_fees sf ON sf.id = fi.student_fee_id
         LEFT JOIN fee_structures fs ON fs.id = sf.fee_structure_id
         JOIN students s ON s.id = sf.student_id
         ${FEE_STUDENT_FROM.replace('FROM students s', '')}
         WHERE GREATEST(fi.amount_due - COALESCE(fi.amount_paid, 0), 0) > 0
           ${academicYear ? `AND sf.academic_year = $1` : ''}
           ${classId ? `AND COALESCE(ce.class_id, s.class_id) = $${academicYear ? 2 : 1}` : ''}
         ORDER BY fi.due_date ASC, s.first_name`,
        params
      );
      return NextResponse.json({ success: true, data: result.rows });
    }

    const result = await auth.db.query(
      `SELECT ${FEE_STUDENT_SELECT},
              COALESCE(fs.fee_type, sf.remarks, 'Fee') AS fee_type,
              sf.id AS student_fee_id,
              sf.month,
              sf.due_date,
              sf.amount_due,
              sf.amount_paid,
              sf.discount_amount,
              sf.late_fee_amount,
              sf.status,
              ${DUE_SQL} AS outstanding
       FROM student_fees sf
       LEFT JOIN fee_structures fs ON fs.id = sf.fee_structure_id
       JOIN students s ON s.id = sf.student_id
       ${FEE_STUDENT_FROM.replace('FROM students s', '')}
       ${where}
       ORDER BY c.name, s.first_name, sf.due_date`,
      params
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error loading outstanding fees:', error);
    return NextResponse.json({ success: false, error: 'Failed to load outstanding fees' }, { status: 500 });
  }
}
