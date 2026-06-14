import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrRead } from '@/lib/hr-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { staffId: string } }
) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const month = parseInt(request.nextUrl.searchParams.get('month') || String(new Date().getMonth() + 1), 10);
    const year = parseInt(request.nextUrl.searchParams.get('year') || String(new Date().getFullYear()), 10);

    const result = await db.query(
      `SELECT p.*, s.first_name, s.last_name, s.employee_id, s.department, s.designation,
        s.bank_account_number, s.bank_name, s.bank_ifsc
       FROM payroll p
       JOIN staff s ON p.staff_id = s.id
       WHERE p.staff_id = $1 AND p.month = $2 AND p.year = $3`,
      [params.staffId, month, year]
    );

    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Payslip not found for this period' }, { status: 404 });
    }

    const row = result.rows[0] as Record<string, unknown>;
    const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });

    await db.query(
      `UPDATE payroll SET payslip_generated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [row.id]
    );

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Payslip - ${row.first_name} ${row.last_name}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; color: #333; }
  h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  th { background: #f9fafb; }
  .total { font-weight: bold; font-size: 1.1em; }
  .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
</style></head><body>
<h1>Salary Payslip</h1>
<div class="header">
  <div><strong>${row.first_name} ${row.last_name}</strong><br>ID: ${row.employee_id}<br>${row.designation || ''} · ${row.department || ''}</div>
  <div><strong>${monthName} ${year}</strong><br>Status: ${String(row.status).toUpperCase()}</div>
</div>
<table>
  <tr><th>Earnings</th><th>Amount (₹)</th></tr>
  <tr><td>Basic Salary</td><td>${parseFloat(String(row.basic_salary)).toLocaleString('en-IN')}</td></tr>
  <tr><td>Allowances</td><td>${parseFloat(String(row.allowances)).toLocaleString('en-IN')}</td></tr>
  <tr><th>Deductions</th><th></th></tr>
  <tr><td>Deductions${row.lop_days ? ` (incl. ${row.lop_days} LOP days)` : ''}</td><td>${parseFloat(String(row.deductions)).toLocaleString('en-IN')}</td></tr>
  <tr class="total"><td>Net Salary</td><td>₹${parseFloat(String(row.net_salary)).toLocaleString('en-IN')}</td></tr>
</table>
${parseFloat(String(row.amount_paid || 0)) > 0 ? `<p><strong>Amount Paid:</strong> ₹${parseFloat(String(row.amount_paid)).toLocaleString('en-IN')}${parseFloat(String(row.amount_paid)) < parseFloat(String(row.net_salary)) ? ` &nbsp;|&nbsp; <strong>Balance:</strong> ₹${(parseFloat(String(row.net_salary)) - parseFloat(String(row.amount_paid))).toLocaleString('en-IN')}` : ''}</p>` : ''}
${row.payment_date ? `<p>Payment Date: ${row.payment_date}</p>` : ''}
<p style="color:#6b7280;font-size:12px;margin-top:40px;">Generated on ${new Date().toLocaleDateString('en-IN')}</p>
</body></html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="payslip_${row.employee_id}_${year}_${month}.html"`,
      },
    });
  } catch (error) {
    console.error('Payslip error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate payslip' }, { status: 500 });
  }
}
