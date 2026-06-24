import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import type { DashboardOverview } from '@/shared/types';
import { EXCLUDE_INACTIVE_OUTSTANDING_FEES } from '@/lib/fees/active-student-fee-filter';

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().getDay();

    const academicYear = await safeQuery(async () => {
      const result = await db.query(
        'SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1'
      );
      return (result.rows[0]?.academic_year as string) || new Date().getFullYear().toString();
    }, new Date().getFullYear().toString());

    const total_students = await safeQuery(async () => {
      const result = await db.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM students WHERE status = 'active'"
      );
      return parseInt(result.rows[0]?.count || '0', 10);
    }, 0);

    const total_teachers = await safeQuery(async () => {
      const result = await db.query<{ count: string }>(`
        SELECT COUNT(DISTINCT s.id)::text AS count
        FROM staff s
        WHERE s.status = 'active'
          AND (
            EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.staff_id = s.id)
            OR EXISTS (SELECT 1 FROM class_timetable ct WHERE ct.staff_id = s.id)
          )
      `);
      return parseInt(result.rows[0]?.count || '0', 10);
    }, 0);

    const total_staff = await safeQuery(async () => {
      const result = await db.query("SELECT COUNT(*) as count FROM staff WHERE status = 'active'");
      return parseInt(result.rows[0].count, 10);
    }, 0);

    const total_classes = await safeQuery(async () => {
      const result = await db.query('SELECT COUNT(*) as count FROM classes');
      return parseInt(result.rows[0].count, 10);
    }, 0);

    const total_vehicles = await safeQuery(async () => {
      const result = await db.query(
        "SELECT COUNT(*) as count FROM vehicles WHERE status = 'active'"
      );
      return parseInt(result.rows[0].count, 10);
    }, 0);

    const present_today = await safeQuery(async () => {
      const result = await db.query(
        "SELECT COUNT(*) as count FROM attendance WHERE date = $1 AND status = 'present'",
        [today]
      );
      return parseInt(result.rows[0].count, 10);
    }, 0);

    const absent_today = await safeQuery(async () => {
      const result = await db.query(
        "SELECT COUNT(*) as count FROM attendance WHERE date = $1 AND status = 'absent'",
        [today]
      );
      return parseInt(result.rows[0].count, 10);
    }, 0);

    const attendance_marked = await safeQuery(async () => {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM attendance WHERE date = $1',
        [today]
      );
      return parseInt(result.rows[0].count, 10);
    }, 0);

    const attendance_rate =
      attendance_marked > 0 ? Math.round((present_today / attendance_marked) * 100) : 0;

    const fees_collected = await safeQuery(async () => {
      const result = await db.query(
        `SELECT COALESCE(SUM(amount_paid), 0) as total
         FROM fee_payments
         WHERE status = 'completed'
         AND (academic_year = $1 OR academic_year IS NULL)`,
        [academicYear]
      );
      return parseFloat(result.rows[0].total);
    }, 0);

    const pending_fees = await safeQuery(async () => {
      const result = await db.query(
        `SELECT COALESCE(SUM(
          CASE WHEN sf.amount_due > sf.amount_paid
            THEN sf.amount_due - sf.amount_paid + COALESCE(sf.late_fee_amount, 0)
            ELSE 0 END
        ), 0) as total_pending
        FROM student_fees sf
        JOIN students s ON sf.student_id = s.id
        LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
        WHERE s.status = 'active' AND sf.academic_year = $1 AND sf.amount_due > sf.amount_paid
        ${EXCLUDE_INACTIVE_OUTSTANDING_FEES}`,
        [academicYear]
      );
      return parseFloat(result.rows[0].total_pending);
    }, 0);

    const low_stock_items = await safeQuery(async () => {
      const result = await db.query(
        'SELECT COUNT(*) as count FROM inventory_items WHERE quantity <= COALESCE(min_stock_level, 0)'
      );
      return parseInt(result.rows[0].count, 10);
    }, 0);

    const attendance_chart = await safeQuery(async () => {
      const result = await db.query<{
        date: string;
        present: string;
        total: string;
      }>(
        `SELECT a.date::text,
          COUNT(*) FILTER (WHERE a.status = 'present')::text AS present,
          COUNT(*)::text AS total
         FROM attendance a
         WHERE a.date >= CURRENT_DATE - INTERVAL '6 days'
         GROUP BY a.date
         ORDER BY a.date ASC`
      );
      const byDate = new Map(
        result.rows.map((row) => {
          const present = parseInt(row.present, 10);
          const total = parseInt(row.total, 10);
          return [
            row.date,
            {
              date: row.date,
              present,
              total,
              rate: total > 0 ? Math.round((present / total) * 100) : 0,
            },
          ];
        })
      );

      const series = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const row = byDate.get(dateStr);
        series.push({
          date: dateStr,
          label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
          present: row?.present ?? 0,
          total: row?.total ?? 0,
          rate: row?.rate ?? 0,
        });
      }
      return series;
    }, []);

    const fee_collection_chart = await safeQuery(async () => {
      const result = await db.query<{ month: string; amount: string }>(
        `SELECT TO_CHAR(payment_date, 'YYYY-MM') AS month,
          COALESCE(SUM(amount_paid), 0)::text AS amount
         FROM fee_payments
         WHERE status = 'completed'
           AND payment_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
         GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
         ORDER BY month ASC`
      );
      const byMonth = new Map(
        result.rows.map((row) => [row.month, parseFloat(row.amount)])
      );

      const series = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        series.push({
          month: monthKey,
          label: d.toLocaleDateString('en-IN', { month: 'short' }),
          amount: byMonth.get(monthKey) ?? 0,
        });
      }
      return series;
    }, []);

    const todays_classes = await safeQuery(async () => {
      const result = await db.query(
        `SELECT tp.name AS period_name, tp.start_time::text, tp.end_time::text,
          COALESCE(sub.name, 'Free') AS subject_name,
          COALESCE(s.first_name || ' ' || s.last_name, '—') AS teacher_name,
          c.name AS class_name, sec.name AS section_name
         FROM class_timetable ct
         INNER JOIN timetable_periods tp ON ct.period_id = tp.id
         LEFT JOIN subjects sub ON ct.subject_id = sub.id
         LEFT JOIN staff s ON ct.staff_id = s.id
         LEFT JOIN classes c ON ct.class_id = c.id
         LEFT JOIN sections sec ON ct.section_id = sec.id
         WHERE ct.day_of_week = $1 AND ct.subject_id IS NOT NULL
         ORDER BY tp.sort_order, c.name
         LIMIT 25`,
        [dayOfWeek]
      );
      return result.rows;
    }, []);

    const classes_conducted_today = todays_classes.length;

    const teacher_performance = await safeQuery(async () => {
      const result = await db.query<{
        teacher_name: string;
        activity_count: string;
        syllabus_pct: string;
      }>(
        `SELECT
          s.first_name || ' ' || s.last_name AS teacher_name,
          COUNT(DISTINCT a.id)::text AS activity_count,
          COALESCE(ROUND(AVG(
            CASE WHEN sc.total_periods > 0
              THEN LEAST(100, (COALESCE(sp.periods_completed, 0)::float / sc.total_periods) * 100)
              ELSE 0 END
          )), 0)::text AS syllabus_pct
         FROM staff s
         LEFT JOIN teacher_daily_activities a
           ON a.staff_id = s.id AND a.activity_date >= CURRENT_DATE - 30
         LEFT JOIN syllabus_progress sp ON sp.staff_id = s.id
         LEFT JOIN syllabus_chapters sc ON sc.id = sp.chapter_id AND sc.is_active = true
         WHERE s.status = 'active'
           AND (
             EXISTS (SELECT 1 FROM teacher_assignments ta WHERE ta.staff_id = s.id)
             OR EXISTS (SELECT 1 FROM class_timetable ct WHERE ct.staff_id = s.id)
           )
         GROUP BY s.id, s.first_name, s.last_name
         ORDER BY COUNT(DISTINCT a.id) DESC, syllabus_pct DESC
         LIMIT 5`
      );
      return result.rows.map((row, index) => {
        const activityCount = parseInt(row.activity_count, 10);
        const syllabusPct = parseInt(row.syllabus_pct, 10);
        const score = Math.min(
          100,
          Math.min(30, activityCount * 3) + Math.round(syllabusPct * 0.35)
        );
        return {
          teacher_name: row.teacher_name,
          score,
          rank: index + 1,
          syllabus_progress_pct: syllabusPct,
          activity_count: activityCount,
        };
      });
    }, []);

    const admissions = await safeQuery(async () => {
      const [byStatus, followUpToday, recent] = await Promise.all([
        db.query<{ status: string; count: string }>(
          'SELECT status, COUNT(*)::text AS count FROM admission_inquiries GROUP BY status'
        ),
        db.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM admission_inquiries
           WHERE follow_up_date = CURRENT_DATE AND status NOT IN ('enrolled', 'lost')`
        ),
        db.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM admission_inquiries
           WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`
        ),
      ]);
      const statusCounts: Record<string, number> = {};
      for (const row of byStatus.rows) {
        statusCounts[row.status] = parseInt(row.count, 10);
      }
      const total = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);
      const active = total - (statusCounts.enrolled || 0) - (statusCounts.lost || 0);
      return {
        total,
        active,
        follow_up_today: parseInt(followUpToday.rows[0]?.count || '0', 10),
        new_this_week: parseInt(recent.rows[0]?.count || '0', 10),
      };
    }, { total: 0, active: 0, follow_up_today: 0, new_this_week: 0 });

    const exams = await safeQuery(async () => {
      const result = await db.query<{ upcoming: string; total: string }>(
        `SELECT
          COUNT(*) FILTER (WHERE exam_date >= CURRENT_DATE)::text AS upcoming,
          COUNT(*)::text AS total
         FROM exams`
      );
      return {
        upcoming: parseInt(result.rows[0]?.upcoming || '0', 10),
        total: parseInt(result.rows[0]?.total || '0', 10),
      };
    }, { upcoming: 0, total: 0 });

    const transport = await safeQuery(async () => {
      const [routes, assignments, vehicles] = await Promise.all([
        db.query("SELECT COUNT(*)::text AS count FROM routes WHERE status = 'active'"),
        db.query("SELECT COUNT(*)::text AS count FROM student_transport WHERE status = 'active'"),
        db.query("SELECT COUNT(*)::text AS count FROM vehicles WHERE status = 'active'"),
      ]);
      return {
        active_routes: parseInt(routes.rows[0]?.count || '0', 10),
        student_assignments: parseInt(assignments.rows[0]?.count || '0', 10),
        active_vehicles: parseInt(vehicles.rows[0]?.count || '0', 10),
      };
    }, { active_routes: 0, student_assignments: 0, active_vehicles: total_vehicles });

    const library = await safeQuery(async () => {
      const result = await db.query<{ total: string; low: string }>(
        `SELECT COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE quantity <= COALESCE(min_stock_level, 0))::text AS low
         FROM inventory_items`
      );
      return {
        total_items: parseInt(result.rows[0]?.total || '0', 10),
        low_stock: parseInt(result.rows[0]?.low || '0', 10),
      };
    }, { total_items: 0, low_stock: low_stock_items });

    const recent_activities = await safeQuery(async () => {
      const activities: DashboardOverview['recent_activities'] = [];

      const payments = await db.query(
        `SELECT fp.amount_paid, fp.payment_date, s.first_name, s.last_name
         FROM fee_payments fp
         JOIN students s ON fp.student_id = s.id
         WHERE fp.status = 'completed'
         ORDER BY fp.payment_date DESC LIMIT 5`
      );
      for (const row of payments.rows) {
        activities.push({
          type: 'payment',
          title: `Fee payment — ${row.first_name} ${row.last_name}`,
          subtitle: `₹${parseFloat(row.amount_paid).toLocaleString('en-IN')}`,
          time: formatRelativeTime(row.payment_date),
        });
      }

      const inquiries = await safeQuery(
        async () =>
          db.query(
            `SELECT student_first_name, student_last_name, status, created_at
             FROM admission_inquiries ORDER BY created_at DESC LIMIT 5`
          ),
        { rows: [] }
      );
      for (const row of inquiries.rows) {
        activities.push({
          type: 'admission',
          title: `Admission inquiry — ${row.student_first_name} ${row.student_last_name || ''}`.trim(),
          subtitle: row.status,
          time: formatRelativeTime(row.created_at),
        });
      }

      activities.sort((a, b) => {
        const order = ['payment', 'admission'];
        return order.indexOf(a.type) - order.indexOf(b.type);
      });

      return activities.slice(0, 8);
    }, []);

    const alerts: DashboardOverview['alerts'] = [];

    if (attendance_marked > 0 && attendance_rate < 85) {
      alerts.push({
        type: 'attendance',
        message: `Student attendance is ${attendance_rate}% today (${absent_today} absent)`,
        severity: attendance_rate < 70 ? 'high' : 'medium',
        href: '/attendance/students',
      });
    } else if (attendance_marked === 0) {
      alerts.push({
        type: 'attendance',
        message: 'Student attendance not marked for today',
        severity: 'medium',
        href: '/attendance/students',
      });
    }

    if (pending_fees > 0) {
      alerts.push({
        type: 'fees',
        message: `₹${pending_fees.toLocaleString('en-IN', { maximumFractionDigits: 0 })} in pending fees`,
        severity: pending_fees > 100000 ? 'high' : 'medium',
        href: '/fees',
      });
    }

    if (admissions.follow_up_today > 0) {
      alerts.push({
        type: 'admissions',
        message: `${admissions.follow_up_today} admission follow-up(s) due today`,
        severity: 'medium',
        href: '/admissions',
      });
    }

    if (low_stock_items > 0) {
      alerts.push({
        type: 'inventory',
        message: `${low_stock_items} inventory item(s) low on stock`,
        severity: 'low',
        href: '/inventory',
      });
    }

    if (exams.upcoming > 0) {
      alerts.push({
        type: 'exams',
        message: `${exams.upcoming} upcoming exam(s) scheduled`,
        severity: 'low',
        href: '/exams',
      });
    }

    const stats: DashboardOverview = {
      total_students,
      total_staff,
      total_teachers,
      total_classes,
      total_vehicles,
      present_today,
      absent_today,
      pending_fees,
      low_stock_items,
      fees_collected,
      attendance_rate,
      attendance_marked,
      attendance_chart,
      fee_collection_chart,
      todays_classes,
      classes_conducted_today,
      teacher_performance,
      alerts,
      recent_activities,
      admissions,
      exams,
      transport,
      library,
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
