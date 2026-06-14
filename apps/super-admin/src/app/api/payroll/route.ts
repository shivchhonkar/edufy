import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrAdmin, requireHrRead } from '@/lib/hr-auth';
import { calculateStaffSalary } from '@/lib/payroll-engine';

async function getRun(
  db: Awaited<ReturnType<typeof getRequestDb>>['db'],
  month: number,
  year: number
) {
  const result = await db.query(
    'SELECT * FROM payroll_runs WHERE month = $1 AND year = $2',
    [month, year]
  );
  return result.rows[0] || null;
}

async function isPeriodFrozen(
  db: Awaited<ReturnType<typeof getRequestDb>>['db'],
  month: number,
  year: number
): Promise<boolean> {
  const run = await getRun(db, month, year);
  return !!run?.is_frozen;
}

function payrollAmountPaid(row: {
  amount_paid?: string | number | null;
  status?: string;
  net_salary?: string | number | null;
  is_advance?: boolean;
}) {
  const paid = parseFloat(String(row.amount_paid ?? 0));
  if (paid > 0) return paid;
  if (row.status === 'paid' && !row.is_advance) {
    return parseFloat(String(row.net_salary ?? 0));
  }
  return 0;
}

async function syncRunStatus(
  db: Awaited<ReturnType<typeof getRequestDb>>['db'],
  month: number,
  year: number
) {
  const stats = await db.query(
    `SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
      COALESCE(SUM(net_salary), 0)::numeric AS total_amount
    FROM payroll WHERE month = $1 AND year = $2`,
    [month, year]
  );
  const { total, paid_count, total_amount } = stats.rows[0] as {
    total: number; paid_count: number; total_amount: string;
  };
  const status = total > 0 && paid_count === total ? 'paid' : paid_count > 0 ? 'processed' : 'processed';
  await db.query(
    `INSERT INTO payroll_runs (month, year, status, total_amount, staff_count, processed_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     ON CONFLICT (month, year)
     DO UPDATE SET status = $3, total_amount = $4, staff_count = $5,
       processed_at = CASE WHEN payroll_runs.is_frozen THEN payroll_runs.processed_at ELSE CURRENT_TIMESTAMP END`,
    [month, year, status, total_amount, total]
  ).catch(() => {});
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const month = request.nextUrl.searchParams.get('month');
    const year = request.nextUrl.searchParams.get('year');

    let query = `
      SELECT p.*, s.first_name, s.last_name, s.employee_id, s.department
      FROM payroll p
      INNER JOIN staff s ON p.staff_id = s.id
      WHERE 1=1`;
    const params: number[] = [];

    if (month) {
      params.push(parseInt(month, 10));
      query += ` AND p.month = $${params.length}`;
    }
    if (year) {
      params.push(parseInt(year, 10));
      query += ` AND p.year = $${params.length}`;
    }
    query += ' ORDER BY s.first_name, s.last_name';

    const [payroll, runs, periodRun] = await Promise.all([
      db.query(query, params),
      db.query('SELECT * FROM payroll_runs ORDER BY year DESC, month DESC').catch(() => ({ rows: [] })),
      month && year
        ? db.query('SELECT * FROM payroll_runs WHERE month = $1 AND year = $2', [parseInt(month, 10), parseInt(year, 10)])
        : Promise.resolve({ rows: [] }),
    ]);

    const summary = payroll.rows.length
      ? {
          total: payroll.rows.length,
          paid: payroll.rows.filter((r: { status: string }) => r.status === 'paid').length,
          pending: payroll.rows.filter((r: { status: string }) => r.status !== 'paid').length,
          total_net: payroll.rows.reduce((s: number, r: { net_salary: string }) => s + parseFloat(r.net_salary || '0'), 0),
          paid_amount: payroll.rows.reduce(
            (s: number, r: { amount_paid?: string; status: string; net_salary: string }) => s + payrollAmountPaid(r),
            0
          ),
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        payroll: payroll.rows,
        runs: runs.rows,
        period: periodRun.rows[0] || null,
        summary,
      },
    });
  } catch (error) {
    console.error('Payroll fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch payroll' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrAdmin(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    const body = await request.json();
    const {
      month, year, action, payroll_ids, staff_ids,
      payment_method, transaction_id, remarks, is_advance, advance_amounts,
    } = body;

    if (!month || !year) {
      return NextResponse.json({ success: false, error: 'month and year are required' }, { status: 400 });
    }

    if (action === 'freeze') {
      await db.query(
        `INSERT INTO payroll_runs (month, year, is_frozen, frozen_at, notes)
         VALUES ($1, $2, true, CURRENT_TIMESTAMP, $3)
         ON CONFLICT (month, year)
         DO UPDATE SET is_frozen = true, frozen_at = CURRENT_TIMESTAMP, notes = COALESCE($3, payroll_runs.notes)`,
        [month, year, remarks || 'Period frozen']
      );
      return NextResponse.json({ success: true, message: 'Payroll period frozen. No further changes allowed.' });
    }

    if (action === 'unfreeze') {
      await db.query(
        `UPDATE payroll_runs SET is_frozen = false, frozen_at = NULL WHERE month = $1 AND year = $2`,
        [month, year]
      );
      return NextResponse.json({ success: true, message: 'Payroll period unfrozen. You can edit and pay again.' });
    }

    if (await isPeriodFrozen(db, month, year) && ['generate', 'mark_paid', 'pay_advance'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'This payroll period is frozen. Unfreeze it first.' },
        { status: 400 }
      );
    }

    if (action === 'generate') {
      const staff = await db.query(`SELECT id FROM staff WHERE status = 'active'`);
      let totalAmount = 0;
      let count = 0;

      for (const member of staff.rows) {
        const calc = await calculateStaffSalary(db, member.id, month, year);
        await db.query(
          `INSERT INTO payroll (staff_id, month, year, basic_salary, allowances, deductions, net_salary, lop_days, structure_id, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
           ON CONFLICT (staff_id, month, year)
           DO UPDATE SET basic_salary = $4, allowances = $5, deductions = $6, net_salary = $7,
             lop_days = $8, structure_id = $9
           WHERE payroll.status != 'paid' AND COALESCE(payroll.amount_paid, 0) = 0`,
          [member.id, month, year, calc.basic, calc.allowances, calc.deductions, calc.net, calc.lopDays, calc.structureId]
        );
        totalAmount += calc.net;
        count += 1;
      }

      await db.query(
        `INSERT INTO payroll_runs (month, year, status, total_amount, staff_count, processed_at, is_frozen)
         VALUES ($1,$2,'processed',$3,$4,CURRENT_TIMESTAMP, false)
         ON CONFLICT (month, year)
         DO UPDATE SET status = 'processed', total_amount = $3, staff_count = $4, processed_at = CURRENT_TIMESTAMP`,
        [month, year, totalAmount, count]
      ).catch(() => {});

      return NextResponse.json({
        success: true,
        message: `Generated payroll for ${count} staff`,
        data: { staff_count: count, total_amount: totalAmount },
      });
    }

    if (action === 'mark_paid') {
      let updated = 0;
      if (Array.isArray(payroll_ids) && payroll_ids.length > 0) {
        const result = await db.query(
          `UPDATE payroll SET status = 'paid', amount_paid = net_salary,
            payment_date = CURRENT_DATE, paid_at = CURRENT_TIMESTAMP,
            payment_method = COALESCE($1, payment_method), transaction_id = COALESCE($2, transaction_id),
            is_advance = COALESCE($3, is_advance, false)
           WHERE id = ANY($4::int[]) AND status != 'paid' AND month = $5 AND year = $6
           RETURNING id`,
          [payment_method || null, transaction_id || null, is_advance ?? false, payroll_ids, month, year]
        );
        updated = result.rows.length;
      } else {
        const result = await db.query(
          `UPDATE payroll SET status = 'paid', amount_paid = net_salary,
            payment_date = CURRENT_DATE, paid_at = CURRENT_TIMESTAMP,
            payment_method = COALESCE($1, payment_method), transaction_id = COALESCE($2, transaction_id)
           WHERE month = $3 AND year = $4 AND status != 'paid'
           RETURNING id`,
          [payment_method || null, transaction_id || null, month, year]
        );
        updated = result.rows.length;
      }
      await syncRunStatus(db, month, year);
      return NextResponse.json({
        success: true,
        message: `Marked ${updated} payment(s) as paid`,
        data: { updated },
      });
    }

    if (action === 'pay_advance') {
      const ids: number[] = Array.isArray(staff_ids) ? staff_ids : [];
      if (!ids.length) {
        return NextResponse.json({ success: false, error: 'staff_ids required for advance payment' }, { status: 400 });
      }

      const amountsMap = (advance_amounts && typeof advance_amounts === 'object' ? advance_amounts : {}) as Record<string, number>;

      let count = 0;
      for (const staffId of ids) {
        const advanceAmount = parseFloat(String(amountsMap[staffId] ?? amountsMap[String(staffId)] ?? ''));
        if (!advanceAmount || advanceAmount <= 0) {
          return NextResponse.json(
            { success: false, error: `Enter a valid advance amount for each selected staff member` },
            { status: 400 }
          );
        }

        const calc = await calculateStaffSalary(db, staffId, month, year);
        const existing = await db.query(
          `SELECT amount_paid, net_salary, status FROM payroll WHERE staff_id = $1 AND month = $2 AND year = $3`,
          [staffId, month, year]
        );
        const currentPaid = parseFloat(String(existing.rows[0]?.amount_paid ?? 0));
        const netSalary = existing.rows[0]
          ? parseFloat(String(existing.rows[0].net_salary ?? calc.net))
          : calc.net;

        if (existing.rows[0]?.status === 'paid' && currentPaid >= netSalary) {
          return NextResponse.json(
            { success: false, error: `Payroll already fully paid for staff #${staffId}` },
            { status: 400 }
          );
        }

        const remaining = netSalary - currentPaid;
        if (advanceAmount > remaining + 0.01) {
          return NextResponse.json(
            { success: false, error: `Advance amount exceeds balance due (₹${remaining.toLocaleString('en-IN')}) for staff #${staffId}` },
            { status: 400 }
          );
        }

        const newAmountPaid = currentPaid + advanceAmount;
        const newStatus = newAmountPaid >= netSalary ? 'paid' : 'partial_advance';

        const result = await db.query(
          `INSERT INTO payroll (staff_id, month, year, basic_salary, allowances, deductions, net_salary,
            lop_days, structure_id, status, amount_paid, payment_date, paid_at, payment_method, transaction_id, is_advance, remarks)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_DATE,CURRENT_TIMESTAMP,$12,$13,true,$14)
           ON CONFLICT (staff_id, month, year)
           DO UPDATE SET
             amount_paid = COALESCE(payroll.amount_paid, 0) + $11,
             status = CASE
               WHEN COALESCE(payroll.amount_paid, 0) + $11 >= payroll.net_salary THEN 'paid'
               ELSE 'partial_advance'
             END,
             payment_date = CURRENT_DATE,
             paid_at = CURRENT_TIMESTAMP,
             payment_method = COALESCE($12, payroll.payment_method),
             transaction_id = COALESCE($13, payroll.transaction_id),
             is_advance = true,
             remarks = COALESCE($14, payroll.remarks)
           WHERE COALESCE(payroll.amount_paid, 0) < payroll.net_salary
           RETURNING id`,
          [
            staffId, month, year, calc.basic, calc.allowances, calc.deductions, calc.net,
            calc.lopDays, calc.structureId, newStatus, advanceAmount,
            payment_method || 'advance', transaction_id || null,
            remarks || 'Advance salary payment',
          ]
        );
        if (result.rows.length) count += 1;
      }
      await syncRunStatus(db, month, year);
      return NextResponse.json({
        success: true,
        message: `Advance payment recorded for ${count} staff`,
        data: { count },
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Payroll process error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process payroll' }, { status: 500 });
  }
}
