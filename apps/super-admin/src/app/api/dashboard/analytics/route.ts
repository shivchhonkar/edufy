import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import { classNameOrderSql } from '@/lib/class-sort';
import type { AnalyticsOverview } from '@/shared/types';

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    const today = new Date().toISOString().split('T')[0];

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
      const result = await db.query('SELECT COUNT(*) as count FROM attendance WHERE date = $1', [
        today,
      ]);
      return parseInt(result.rows[0].count, 10);
    }, 0);

    const attendance_rate_today =
      attendance_marked > 0 ? Math.round((present_today / attendance_marked) * 100) : 0;

    const fees_collected = await safeQuery(async () => {
      const result = await db.query<{ total: string }>(
        `SELECT COALESCE(SUM(amount_paid), 0)::text AS total
         FROM fee_payments WHERE status = 'completed'`
      );
      return parseFloat(result.rows[0]?.total || '0');
    }, 0);

    const pending_fees = await safeQuery(async () => {
      const result = await db.query<{ total: string }>(
        `SELECT COALESCE(SUM(sf.amount_due - sf.amount_paid), 0)::text AS total
         FROM student_fees sf
         JOIN students s ON sf.student_id = s.id
         WHERE s.status = 'active' AND sf.academic_year = $1 AND sf.amount_due > sf.amount_paid`,
        [academicYear]
      );
      return parseFloat(result.rows[0]?.total || '0');
    }, 0);

    const total_due = fees_collected + pending_fees;
    const collection_rate = total_due > 0 ? Math.round((fees_collected / total_due) * 100) : 0;

    const fee_payments_month = await safeQuery(async () => {
      const result = await db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM fee_payments
         WHERE status = 'completed'
           AND payment_date >= DATE_TRUNC('month', CURRENT_DATE)`
      );
      return parseInt(result.rows[0]?.count || '0', 10);
    }, 0);

    const active_admissions = await safeQuery(async () => {
      const result = await db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM admission_inquiries
         WHERE status NOT IN ('enrolled', 'lost')`
      );
      return parseInt(result.rows[0]?.count || '0', 10);
    }, 0);

    const new_admissions_month = await safeQuery(async () => {
      const result = await db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM admission_inquiries
         WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)`
      );
      return parseInt(result.rows[0]?.count || '0', 10);
    }, 0);

    const upcoming_exams = await safeQuery(async () => {
      const result = await db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM exams WHERE exam_date >= CURRENT_DATE`
      );
      return parseInt(result.rows[0]?.count || '0', 10);
    }, 0);

    const attendance_trend_30d = await safeQuery(async () => {
      const result = await db.query<{
        date: string;
        present: string;
        total: string;
      }>(
        `SELECT a.date::text,
          COUNT(*) FILTER (WHERE a.status = 'present')::text AS present,
          COUNT(*)::text AS total
         FROM attendance a
         WHERE a.date >= CURRENT_DATE - INTERVAL '29 days'
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
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const row = byDate.get(dateStr);
        series.push({
          date: dateStr,
          label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
          present: row?.present ?? 0,
          total: row?.total ?? 0,
          rate: row?.rate ?? 0,
        });
      }
      return series;
    }, []);

    const rates7 = attendance_trend_30d.slice(-7).filter((d) => d.total > 0);
    const rates30 = attendance_trend_30d.filter((d) => d.total > 0);
    const avg_attendance_7d =
      rates7.length > 0
        ? Math.round(rates7.reduce((sum, d) => sum + d.rate, 0) / rates7.length)
        : 0;
    const avg_attendance_30d =
      rates30.length > 0
        ? Math.round(rates30.reduce((sum, d) => sum + d.rate, 0) / rates30.length)
        : 0;

    const fee_collection_12m = await safeQuery(async () => {
      const result = await db.query<{ month: string; amount: string }>(
        `SELECT TO_CHAR(payment_date, 'YYYY-MM') AS month,
          COALESCE(SUM(amount_paid), 0)::text AS amount
         FROM fee_payments
         WHERE status = 'completed'
           AND payment_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months'
         GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
         ORDER BY month ASC`
      );
      const byMonth = new Map(result.rows.map((row) => [row.month, parseFloat(row.amount)]));

      const series = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        series.push({
          month: monthKey,
          label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
          amount: byMonth.get(monthKey) ?? 0,
        });
      }
      return series;
    }, []);

    const students_by_class = await safeQuery(async () => {
      const result = await db.query<{ name: string; count: string }>(
        `SELECT COALESCE(c.name, 'Unassigned') AS name, COUNT(s.id)::text AS count
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         WHERE s.status = 'active'
         GROUP BY c.name
         ORDER BY ${classNameOrderSql('c.name', { nullsFirst: true, prioritizeNull: true })}`
      );
      return result.rows.map((row) => ({
        name: row.name,
        count: parseInt(row.count, 10),
      }));
    }, []);

    const admissions_by_status = await safeQuery(async () => {
      const result = await db.query<{ status: string; count: string }>(
        `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::text AS count
         FROM admission_inquiries
         GROUP BY status
         ORDER BY count DESC`
      );
      return result.rows.map((row) => ({
        name: row.status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        count: parseInt(row.count, 10),
      }));
    }, []);

    const admissions_trend_6m = await safeQuery(async () => {
      const result = await db.query<{ month: string; count: string }>(
        `SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(*)::text AS count
         FROM admission_inquiries
         WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
         GROUP BY TO_CHAR(created_at, 'YYYY-MM')
         ORDER BY month ASC`
      );
      const byMonth = new Map(result.rows.map((row) => [row.month, parseInt(row.count, 10)]));

      const series = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        series.push({
          month: monthKey,
          label: d.toLocaleDateString('en-IN', { month: 'short' }),
          count: byMonth.get(monthKey) ?? 0,
        });
      }
      return series;
    }, []);

    const staff_by_department = await safeQuery(async () => {
      const result = await db.query<{ name: string; count: string }>(
        `SELECT COALESCE(d.name, 'Unassigned') AS name, COUNT(s.id)::text AS count
         FROM staff s
         LEFT JOIN departments d ON s.department_id = d.id
         WHERE s.status = 'active'
         GROUP BY d.name
         ORDER BY count DESC`
      );
      return result.rows.map((row) => ({
        name: row.name,
        count: parseInt(row.count, 10),
      }));
    }, []);

    const data: AnalyticsOverview = {
      kpis: {
        total_students,
        total_staff,
        total_teachers,
        total_classes,
        fees_collected,
        pending_fees,
        collection_rate,
        attendance_rate_today,
        avg_attendance_7d,
        avg_attendance_30d,
        active_admissions,
        new_admissions_month,
        fee_payments_month,
        upcoming_exams,
      },
      attendance_trend_30d,
      fee_collection_12m,
      students_by_class,
      admissions_by_status,
      admissions_trend_6m,
      staff_by_department,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
