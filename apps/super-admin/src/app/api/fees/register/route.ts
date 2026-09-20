import { NextRequest, NextResponse } from 'next/server';
import { FEE_STUDENT_FROM, FEE_STUDENT_SELECT, requireFeeOps } from '@/lib/fee-operations-utils';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFeeOps(request);
    if (auth instanceof NextResponse) return auth;

    const view = request.nextUrl.searchParams.get('view') || 'detailed';
    const academicYear = request.nextUrl.searchParams.get('academic_year') || '';
    const classId = request.nextUrl.searchParams.get('class_id');
    const search = request.nextUrl.searchParams.get('search')?.trim() || '';
    const fromDate = request.nextUrl.searchParams.get('from_date') || '';
    const toDate = request.nextUrl.searchParams.get('to_date') || '';

    const params: unknown[] = [];
    const conditions = [`fp.status IN ('completed', 'refunded', 'reversed')`];

    if (academicYear) {
      params.push(academicYear);
      conditions.push(`fp.academic_year = $${params.length}`);
    }
    if (classId) {
      params.push(Number(classId));
      conditions.push(`COALESCE(ce.class_id, s.class_id) = $${params.length}`);
    }
    if (fromDate) {
      params.push(fromDate);
      conditions.push(`fp.payment_date >= $${params.length}::date`);
    }
    if (toDate) {
      params.push(toDate);
      conditions.push(`fp.payment_date <= $${params.length}::date`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(
        s.first_name ILIKE $${params.length}
        OR s.last_name ILIKE $${params.length}
        OR s.admission_number ILIKE $${params.length}
        OR fp.receipt_number ILIKE $${params.length}
      )`);
    }
    if (view === 'discounted') {
      conditions.push(`COALESCE(fp.discount_applied, 0) > 0`);
    } else if (view === 'without_discount') {
      conditions.push(`COALESCE(fp.discount_applied, 0) <= 0`);
    }

    const result = await auth.db.query(
      `SELECT fp.*, ${FEE_STUDENT_SELECT}
       FROM fee_payments fp
       JOIN students s ON s.id = fp.student_id
       ${FEE_STUDENT_FROM.replace('FROM students s', '')}
       WHERE ${conditions.join(' AND ')}
       ORDER BY fp.payment_date DESC, fp.id DESC`,
      params
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error loading fee register:', error);
    return NextResponse.json({ success: false, error: 'Failed to load fee register' }, { status: 500 });
  }
}
