import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrRead } from '@/lib/hr-auth';

function parseStaffId(id: string): number | null {
  const parsed = parseInt(id, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const staffId = parseStaffId(params.id);
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'Invalid staff id' }, { status: 400 });
    }

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const staffCheck = await db.query('SELECT id FROM staff WHERE id = $1', [staffId]);
    if (!staffCheck.rows.length) {
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 });
    }

    const limit = Math.min(
      60,
      Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '24', 10)),
    );

    const result = await db.query(
      `SELECT
        id,
        month,
        year,
        basic_salary,
        allowances,
        deductions,
        net_salary,
        amount_paid,
        lop_days,
        status,
        payment_date,
        payment_method,
        transaction_id,
        is_advance,
        paid_at,
        remarks
       FROM payroll
       WHERE staff_id = $1
       ORDER BY year DESC, month DESC
       LIMIT $2`,
      [staffId, limit],
    );

    const summary = {
      total_records: result.rows.length,
      total_paid: result.rows.reduce(
        (sum: number, row: { amount_paid?: string | number | null; status?: string; net_salary?: string | number | null }) => {
          const paid = parseFloat(String(row.amount_paid ?? 0));
          if (paid > 0) return sum + paid;
          if (row.status === 'paid') return sum + parseFloat(String(row.net_salary ?? 0));
          return sum;
        },
        0,
      ),
      paid_months: result.rows.filter(
        (row: { status?: string }) => row.status === 'paid',
      ).length,
    };

    return NextResponse.json({
      success: true,
      data: result.rows,
      summary,
    });
  } catch (error) {
    console.error('Staff payroll history error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch salary history' },
      { status: 500 },
    );
  }
}
