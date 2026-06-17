import { NextRequest, NextResponse } from 'next/server';
import { getRequestDb } from '@/lib/request-db';
import { ensureHrSchema } from '@/lib/ensure-hr-schema';
import { ensureTeacherPedagogySchema } from '@/lib/ensure-teacher-pedagogy-schema';
import { ensureTimetableSchema } from '@/lib/ensure-timetable-schema';
import { requireHrRead } from '@/lib/hr-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request);
    if (auth instanceof NextResponse) return auth;

    const { db } = await getRequestDb(request);
    await ensureHrSchema(db);
    await ensureTimetableSchema(db);
    await ensureTeacherPedagogySchema(db);

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const safeQuery = async <T extends Record<string, unknown>>(
      queryFactory: () => Promise<{ rows: T[] }>,
      fallbackRows: T[],
    ) => {
      try {
        return await queryFactory();
      } catch (error) {
        console.error('HR dashboard query fallback:', error);
        return { rows: fallbackRows };
      }
    };

    const [
      staffSummary,
      teachersResult,
      pendingLeavesResult,
      departmentsResult,
      payrollResult,
      presentTodayResult,
      recentLeavesResult,
      recentActivitiesResult,
    ] = await Promise.all([
      safeQuery(
        () =>
          db.query<{ active: number; inactive: number; total: number }>(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE status = 'inactive')::int AS inactive,
          COUNT(*)::int AS total
        FROM staff
      `),
        [{ active: 0, inactive: 0, total: 0 }],
      ),
      safeQuery(
        () =>
          db.query<{ count: number }>(`
        SELECT COUNT(DISTINCT s.id)::int AS count
        FROM staff s
        WHERE s.status = 'active'
          AND (
            EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.staff_id = s.id)
            OR EXISTS (SELECT 1 FROM class_timetable ct WHERE ct.staff_id = s.id)
            OR EXISTS (SELECT 1 FROM teacher_daily_activities a WHERE a.staff_id = s.id)
          )
      `),
        [{ count: 0 }],
      ),
      safeQuery(
        () =>
          db.query<{ count: number }>(
          `SELECT COUNT(*)::int AS count FROM staff_leaves WHERE status = 'pending'`,
        ),
        [{ count: 0 }],
      ),
      safeQuery(
        () => db.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM departments`),
        [{ count: 0 }],
      ),
      safeQuery(
        () =>
          db.query<{ pending: number; total_amount: string; paid_count: number; total_count: number }>(
          `SELECT
          COUNT(*) FILTER (WHERE status <> 'paid')::int AS pending,
          COALESCE(SUM(net_salary), 0)::text AS total_amount,
          COUNT(*) FILTER (WHERE status = 'paid')::int AS paid_count,
          COUNT(*)::int AS total_count
         FROM payroll
         WHERE month = $1 AND year = $2`,
          [month, year],
        ),
        [{ pending: 0, total_amount: '0', paid_count: 0, total_count: 0 }],
      ),
      safeQuery(
        () =>
          db.query<{ count: number }>(
          `SELECT COUNT(*)::int AS count
         FROM staff_attendance
         WHERE attendance_date = CURRENT_DATE AND status = 'present'`,
        ),
        [{ count: 0 }],
      ),
      safeQuery(
        () =>
          db.query(
          `SELECT sl.id, sl.start_date, sl.end_date, sl.status, sl.days_requested,
                s.first_name, s.last_name, s.employee_id, lt.name AS leave_type_name
         FROM staff_leaves sl
         JOIN staff s ON sl.staff_id = s.id
         LEFT JOIN leave_types lt ON sl.leave_type_id = lt.id
         ORDER BY sl.created_at DESC
         LIMIT 6`,
        ),
        [],
      ),
      safeQuery(
        () =>
          db.query(
          `SELECT a.id, a.activity_date, a.topic_covered, a.periods_taught,
                s.first_name, s.last_name
         FROM teacher_daily_activities a
         JOIN staff s ON a.staff_id = s.id
         ORDER BY a.activity_date DESC, a.id DESC
         LIMIT 6`,
        ),
        [],
      ),
    ]);

    const staff = staffSummary.rows[0] || { active: 0, inactive: 0, total: 0 };
    const payroll = payrollResult.rows[0] || {
      pending: 0,
      total_amount: '0',
      paid_count: 0,
      total_count: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        total_staff: staff.active,
        inactive_staff: staff.inactive,
        total_teachers: teachersResult.rows[0]?.count || 0,
        pending_leaves: pendingLeavesResult.rows[0]?.count || 0,
        departments: departmentsResult.rows[0]?.count || 0,
        staff_present_today: presentTodayResult.rows[0]?.count || 0,
        payroll_pending: payroll.pending,
        payroll_paid: payroll.paid_count,
        payroll_total_staff: payroll.total_count,
        payroll_amount: parseFloat(payroll.total_amount || '0'),
        payroll_month: month,
        payroll_year: year,
        recent_leaves: recentLeavesResult.rows,
        recent_activities: recentActivitiesResult.rows,
      },
    });
  } catch (error) {
    console.error('HR dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load HR dashboard' },
      { status: 500 },
    );
  }
}
