import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { requireHrRead } from '@/lib/hr-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);

    const type = request.nextUrl.searchParams.get('type') || 'headcount';
    const month = parseInt(request.nextUrl.searchParams.get('month') || String(new Date().getMonth() + 1), 10);
    const year = parseInt(request.nextUrl.searchParams.get('year') || String(new Date().getFullYear()), 10);

    if (type === 'headcount') {
      const byDept = await db.query(`
        SELECT COALESCE(d.name, s.department, 'Unassigned') AS department,
          COUNT(*) FILTER (WHERE s.status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE s.status = 'inactive')::int AS inactive,
          COUNT(*) FILTER (WHERE s.status = 'resigned')::int AS resigned,
          COUNT(*)::int AS total
        FROM staff s
        LEFT JOIN departments d ON s.department_id = d.id
        GROUP BY COALESCE(d.name, s.department, 'Unassigned')
        ORDER BY total DESC
      `);
      const summary = await db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive,
          COUNT(*) FILTER (WHERE status = 'resigned')::int AS resigned,
          COUNT(*)::int AS total
        FROM staff
      `);
      return NextResponse.json({ success: true, data: { summary: summary.rows[0], byDepartment: byDept.rows } });
    }

    if (type === 'attendance') {
      const result = await db.query(`
        SELECT s.first_name, s.last_name, s.employee_id,
          COUNT(*) FILTER (WHERE sa.status = 'present')::int AS present,
          COUNT(*) FILTER (WHERE sa.status = 'absent')::int AS absent,
          COUNT(*) FILTER (WHERE sa.status = 'late')::int AS late,
          COUNT(*) FILTER (WHERE sa.status = 'on_leave')::int AS on_leave,
          COUNT(*)::int AS total_days
        FROM staff s
        LEFT JOIN staff_attendance sa ON sa.staff_id = s.id
          AND EXTRACT(MONTH FROM sa.attendance_date) = $1
          AND EXTRACT(YEAR FROM sa.attendance_date) = $2
        WHERE s.status = 'active'
        GROUP BY s.id, s.first_name, s.last_name, s.employee_id
        ORDER BY s.first_name
      `, [month, year]);
      return NextResponse.json({ success: true, data: result.rows });
    }

    if (type === 'leave') {
      const result = await db.query(`
        SELECT lt.name AS leave_type,
          COUNT(*)::int AS requests,
          COUNT(*) FILTER (WHERE sl.status = 'approved')::int AS approved,
          COUNT(*) FILTER (WHERE sl.status = 'pending')::int AS pending,
          COALESCE(SUM(sl.days_requested) FILTER (WHERE sl.status = 'approved'), 0)::int AS days_taken
        FROM leave_types lt
        LEFT JOIN staff_leaves sl ON sl.leave_type_id = lt.id AND EXTRACT(YEAR FROM sl.start_date) = $1
        GROUP BY lt.id, lt.name ORDER BY lt.name
      `, [year]);
      return NextResponse.json({ success: true, data: result.rows });
    }

    if (type === 'payroll') {
      const result = await db.query(`
        SELECT COALESCE(d.name, s.department, 'Unassigned') AS department,
          COUNT(p.id)::int AS staff_count,
          COALESCE(SUM(p.net_salary), 0)::numeric AS total_net,
          COALESCE(SUM(p.basic_salary), 0)::numeric AS total_basic,
          COALESCE(SUM(p.deductions), 0)::numeric AS total_deductions
        FROM payroll p
        JOIN staff s ON p.staff_id = s.id
        LEFT JOIN departments d ON s.department_id = d.id
        WHERE p.month = $1 AND p.year = $2
        GROUP BY COALESCE(d.name, s.department, 'Unassigned')
        ORDER BY total_net DESC
      `, [month, year]);
      const totals = await db.query(`
        SELECT COUNT(*)::int AS staff_count, COALESCE(SUM(net_salary), 0)::numeric AS total_net
        FROM payroll WHERE month = $1 AND year = $2
      `, [month, year]);
      return NextResponse.json({ success: true, data: { byDepartment: result.rows, totals: totals.rows[0] } });
    }

    return NextResponse.json({ success: false, error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    console.error('HR reports error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate report' }, { status: 500 });
  }
}
