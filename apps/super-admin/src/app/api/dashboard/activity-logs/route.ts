import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedDb } from '@/lib/request-db';
import type { ActivityLogCategory, ActivityLogEntry } from '@/shared/types';

async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

const CATEGORY_LABELS: Record<ActivityLogCategory, string> = {
  payment: 'Fee Payment',
  admission: 'Admission',
  student: 'Student',
  communication: 'Communication',
  exam: 'Exam',
  staff: 'Staff',
  attendance: 'Attendance',
};

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request);
    if (authResult instanceof NextResponse) return authResult;
    const { db } = authResult;

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '30', 10)));
    const categoryFilter = searchParams.get('category') || 'all';
    const days = Math.min(365, Math.max(7, parseInt(searchParams.get('days') || '90', 10)));

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();

    const allEntries: ActivityLogEntry[] = [];

    const payments = await safeQuery(
      async () =>
        db.query(
          `SELECT fp.id, fp.amount_paid, fp.payment_date, fp.payment_method,
            s.first_name, s.last_name, s.id AS student_id
           FROM fee_payments fp
           JOIN students s ON fp.student_id = s.id
           WHERE fp.status = 'completed' AND fp.payment_date >= $1::date
           ORDER BY fp.payment_date DESC
           LIMIT 200`,
          [sinceIso.split('T')[0]]
        ),
      { rows: [] }
    );
    for (const row of payments.rows) {
      allEntries.push({
        id: `payment-${row.id}`,
        category: 'payment',
        title: `Fee payment — ${row.first_name} ${row.last_name}`,
        description: `₹${parseFloat(row.amount_paid).toLocaleString('en-IN')} via ${row.payment_method || 'cash'}`,
        occurred_at: new Date(row.payment_date).toISOString(),
        href: '/fees?tab=overview',
      });
    }

    const inquiries = await safeQuery(
      async () =>
        db.query(
          `SELECT id, student_first_name, student_last_name, status, created_at, updated_at
           FROM admission_inquiries
           WHERE COALESCE(updated_at, created_at) >= $1
           ORDER BY COALESCE(updated_at, created_at) DESC
           LIMIT 200`,
          [sinceIso]
        ),
      { rows: [] }
    );
    for (const row of inquiries.rows) {
      const at = row.updated_at || row.created_at;
      allEntries.push({
        id: `admission-${row.id}`,
        category: 'admission',
        title: `Admission — ${row.student_first_name} ${row.student_last_name || ''}`.trim(),
        description: `Status: ${String(row.status).replace(/_/g, ' ')}`,
        occurred_at: new Date(at).toISOString(),
        href: '/admissions',
      });
    }

    const students = await safeQuery(
      async () =>
        db.query(
          `SELECT s.id, s.first_name, s.last_name, s.admission_number, s.created_at, c.name AS class_name
           FROM students s
           LEFT JOIN classes c ON s.class_id = c.id
           WHERE s.created_at >= $1
           ORDER BY s.created_at DESC
           LIMIT 200`,
          [sinceIso]
        ),
      { rows: [] }
    );
    for (const row of students.rows) {
      allEntries.push({
        id: `student-${row.id}`,
        category: 'student',
        title: `Student enrolled — ${row.first_name} ${row.last_name}`,
        description: `${row.admission_number || '—'}${row.class_name ? ` · ${row.class_name}` : ''}`,
        occurred_at: new Date(row.created_at).toISOString(),
        href: '/students',
      });
    }

    const campaigns = await safeQuery(
      async () =>
        db.query(
          `SELECT id, title, status, total_recipients, sent_count, created_at
           FROM sms_campaigns
           WHERE created_at >= $1
           ORDER BY created_at DESC
           LIMIT 100`,
          [sinceIso]
        ),
      { rows: [] }
    );
    for (const row of campaigns.rows) {
      allEntries.push({
        id: `communication-${row.id}`,
        category: 'communication',
        title: `SMS campaign — ${row.title}`,
        description: `${row.sent_count || 0}/${row.total_recipients || 0} sent · ${row.status}`,
        occurred_at: new Date(row.created_at).toISOString(),
        href: '/communications?tab=history',
      });
    }

    const exams = await safeQuery(
      async () =>
        db.query(
          `SELECT e.id, e.name, e.exam_type, e.exam_date, e.created_at, c.name AS class_name
           FROM exams e
           LEFT JOIN classes c ON e.class_id = c.id
           WHERE COALESCE(e.created_at, e.exam_date::timestamp) >= $1
           ORDER BY COALESCE(e.created_at, e.exam_date::timestamp) DESC
           LIMIT 100`,
          [sinceIso]
        ),
      { rows: [] }
    );
    for (const row of exams.rows) {
      const at = row.created_at || row.exam_date;
      allEntries.push({
        id: `exam-${row.id}`,
        category: 'exam',
        title: `Exam scheduled — ${row.name}`,
        description: `${row.exam_type || 'Exam'}${row.class_name ? ` · ${row.class_name}` : ''}`,
        occurred_at: new Date(at).toISOString(),
        href: '/exams',
      });
    }

    const staffRows = await safeQuery(
      async () =>
        db.query(
          `SELECT s.id, s.first_name, s.last_name, s.created_at, d.name AS department_name
           FROM staff s
           LEFT JOIN departments d ON s.department_id = d.id
           WHERE s.created_at >= $1
           ORDER BY s.created_at DESC
           LIMIT 100`,
          [sinceIso]
        ),
      { rows: [] }
    );
    for (const row of staffRows.rows) {
      allEntries.push({
        id: `staff-${row.id}`,
        category: 'staff',
        title: `Staff added — ${row.first_name} ${row.last_name}`,
        description: row.department_name || 'Staff record created',
        occurred_at: new Date(row.created_at).toISOString(),
        href: '/staff',
      });
    }

    const attendanceRows = await safeQuery(
      async () =>
        db.query(
          `SELECT a.id, a.date, a.status,
            s.first_name, s.last_name
           FROM attendance a
           JOIN students s ON a.student_id = s.id
           WHERE a.date >= $1::date
           ORDER BY a.date DESC, a.id DESC
           LIMIT 150`,
          [sinceIso.split('T')[0]]
        ),
      { rows: [] }
    );
    for (const row of attendanceRows.rows) {
      allEntries.push({
        id: `attendance-${row.id}`,
        category: 'attendance',
        title: `Attendance — ${row.first_name} ${row.last_name}`,
        description: `${row.status} on ${new Date(row.date).toLocaleDateString('en-IN')}`,
        occurred_at: new Date(row.date).toISOString(),
        href: '/attendance/students',
      });
    }

    allEntries.sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
    );

    const categoryCounts = new Map<ActivityLogCategory, number>();
    for (const entry of allEntries) {
      categoryCounts.set(entry.category, (categoryCounts.get(entry.category) || 0) + 1);
    }

    const filtered =
      categoryFilter === 'all'
        ? allEntries
        : allEntries.filter((e) => e.category === categoryFilter);

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const items = filtered.slice(offset, offset + limit);

    const categories = [
      { id: 'all' as const, label: 'All', count: allEntries.length },
      ...(Object.keys(CATEGORY_LABELS) as ActivityLogCategory[]).map((id) => ({
        id,
        label: CATEGORY_LABELS[id],
        count: categoryCounts.get(id) || 0,
      })),
    ];

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        limit,
        categories,
      },
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
