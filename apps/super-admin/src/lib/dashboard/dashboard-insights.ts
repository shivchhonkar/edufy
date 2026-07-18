import type {
  DashboardBirthdayItem,
  DashboardOutstandingFeesSummary,
  DashboardPendingTask,
  DashboardStaffAttendanceToday,
} from '@/shared/types';
import type { RequestDb } from '@/lib/request-db';
import { EXCLUDE_INACTIVE_OUTSTANDING_FEES } from '@/lib/fees/active-student-fee-filter';

const UPCOMING_BIRTHDAY_DAYS = 7;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysUntilBirthday(dateOfBirth: string, today = startOfDay(new Date())): number | null {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < today) {
    next = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
  }

  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

function birthdayLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'Today';
  if (daysUntil === 1) return 'Tomorrow';

  const date = startOfDay(new Date());
  date.setDate(date.getDate() + daysUntil);
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function buildBirthdayItem(
  row: {
    id: number;
    name: string;
    person_type: 'student' | 'staff';
    class_name: string | null;
    section_name: string | null;
    date_of_birth: string;
  },
  daysUntil: number,
): DashboardBirthdayItem {
  return {
    id: row.id,
    name: row.name.trim(),
    person_type: row.person_type,
    class_name: row.class_name,
    section_name: row.section_name,
    date_of_birth: row.date_of_birth,
    birthday_label: birthdayLabel(daysUntil),
    days_until: daysUntil,
  };
}

export async function fetchUpcomingBirthdays(
  db: RequestDb,
  limit = 8,
): Promise<DashboardBirthdayItem[]> {
  const [studentsResult, staffResult] = await Promise.all([
    db.query<{
      id: number;
      first_name: string;
      last_name: string | null;
      date_of_birth: string;
      class_name: string | null;
      section_name: string | null;
    }>(
      `SELECT s.id, s.first_name, s.last_name, s.date_of_birth::text,
              c.name AS class_name, sec.name AS section_name
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN sections sec ON sec.id = s.section_id
       WHERE s.status = 'active' AND s.date_of_birth IS NOT NULL`,
    ),
    db.query<{
      id: number;
      first_name: string;
      last_name: string | null;
      date_of_birth: string;
    }>(
      `SELECT id, first_name, last_name, date_of_birth::text
       FROM staff
       WHERE status = 'active' AND date_of_birth IS NOT NULL`,
    ),
  ]);

  const today = startOfDay(new Date());
  const items: DashboardBirthdayItem[] = [];

  for (const row of studentsResult.rows) {
    const daysUntil = daysUntilBirthday(row.date_of_birth, today);
    if (daysUntil === null || daysUntil > UPCOMING_BIRTHDAY_DAYS) continue;
    items.push(
      buildBirthdayItem(
        {
          id: row.id,
          name: `${row.first_name} ${row.last_name || ''}`.trim(),
          person_type: 'student',
          class_name: row.class_name,
          section_name: row.section_name,
          date_of_birth: row.date_of_birth,
        },
        daysUntil,
      ),
    );
  }

  for (const row of staffResult.rows) {
    const daysUntil = daysUntilBirthday(row.date_of_birth, today);
    if (daysUntil === null || daysUntil > UPCOMING_BIRTHDAY_DAYS) continue;
    items.push(
      buildBirthdayItem(
        {
          id: row.id,
          name: `${row.first_name} ${row.last_name || ''}`.trim(),
          person_type: 'staff',
          class_name: null,
          section_name: null,
          date_of_birth: row.date_of_birth,
        },
        daysUntil,
      ),
    );
  }

  return items
    .sort((a, b) => a.days_until - b.days_until || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export async function fetchPendingTasks(
  db: RequestDb,
  academicYear: string,
  limit = 8,
): Promise<DashboardPendingTask[]> {
  const tasks: DashboardPendingTask[] = [];

  const [followUps, pendingLeaves, overdueFees] = await Promise.all([
    db.query<{
      id: number;
      student_first_name: string;
      student_last_name: string | null;
      follow_up_date: string;
    }>(
      `SELECT id, student_first_name, student_last_name, follow_up_date::text
       FROM admission_inquiries
       WHERE status NOT IN ('enrolled', 'lost')
         AND follow_up_date IS NOT NULL
         AND follow_up_date <= CURRENT_DATE
       ORDER BY follow_up_date ASC
       LIMIT 5`,
    ),
    db.query<{
      id: number;
      first_name: string;
      last_name: string | null;
      days_requested: number | null;
      start_date: string;
    }>(
      `SELECT sl.id, s.first_name, s.last_name, sl.days_requested, sl.start_date::text
       FROM staff_leaves sl
       JOIN staff s ON s.id = sl.staff_id
       WHERE sl.status = 'pending'
       ORDER BY sl.created_at ASC
       LIMIT 5`,
    ),
    db.query<{ count: string }>(
      `SELECT COUNT(DISTINCT sf.student_id)::text AS count
       FROM student_fees sf
       JOIN students s ON sf.student_id = s.id
       LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
       WHERE s.status = 'active'
         AND sf.academic_year = $1
         AND sf.amount_due > sf.amount_paid
         ${EXCLUDE_INACTIVE_OUTSTANDING_FEES}`,
      [academicYear],
    ),
  ]);

  for (const row of followUps.rows) {
    const name = `${row.student_first_name} ${row.student_last_name || ''}`.trim();
    const dueDate = new Date(row.follow_up_date);
    const isOverdue = dueDate < startOfDay(new Date());
    tasks.push({
      id: `admission-${row.id}`,
      title: `Admission follow-up — ${name}`,
      subtitle: isOverdue ? 'Overdue' : 'Due today',
      href: '/admissions',
      severity: isOverdue ? 'high' : 'medium',
    });
  }

  for (const row of pendingLeaves.rows) {
    const name = `${row.first_name} ${row.last_name || ''}`.trim();
    tasks.push({
      id: `leave-${row.id}`,
      title: `Leave approval — ${name}`,
      subtitle: row.days_requested
        ? `${row.days_requested} day(s) from ${new Date(row.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`
        : 'Pending approval',
      href: '/hr/leaves',
      severity: 'medium',
    });
  }

  const overdueStudentCount = parseInt(overdueFees.rows[0]?.count || '0', 10);
  if (overdueStudentCount > 0) {
    tasks.push({
      id: 'fees-outstanding',
      title: 'Collect outstanding fees',
      subtitle: `${overdueStudentCount} student${overdueStudentCount === 1 ? '' : 's'} with dues`,
      href: '/fees/ledger',
      severity: overdueStudentCount > 20 ? 'high' : 'low',
    });
  }

  return tasks.slice(0, limit);
}

export async function fetchStaffAttendanceToday(
  db: RequestDb,
  totalActiveStaff: number,
): Promise<DashboardStaffAttendanceToday> {
  const result = await db.query<{
    present: string;
    absent: string;
    on_leave: string;
    marked: string;
  }>(
    `SELECT
      COUNT(*) FILTER (WHERE status = 'present')::text AS present,
      COUNT(*) FILTER (WHERE status = 'absent')::text AS absent,
      COUNT(*) FILTER (WHERE status IN ('leave', 'on_leave', 'half_day'))::text AS on_leave,
      COUNT(*)::text AS marked
     FROM staff_attendance
     WHERE attendance_date = CURRENT_DATE`,
  );

  const row = result.rows[0];
  const present = parseInt(row?.present || '0', 10);
  const absent = parseInt(row?.absent || '0', 10);
  const on_leave = parseInt(row?.on_leave || '0', 10);
  const marked = parseInt(row?.marked || '0', 10);
  const not_marked = Math.max(0, totalActiveStaff - marked);

  return {
    total_staff: totalActiveStaff,
    present,
    absent,
    on_leave,
    marked,
    not_marked,
  };
}

export async function fetchOutstandingFeesSummary(
  db: RequestDb,
  academicYear: string,
): Promise<DashboardOutstandingFeesSummary> {
  const result = await db.query<{
    total_pending: string;
    students_with_dues: string;
  }>(
    `SELECT
      COALESCE(SUM(
        CASE WHEN sf.amount_due > sf.amount_paid
          THEN sf.amount_due - sf.amount_paid + COALESCE(sf.late_fee_amount, 0)
          ELSE 0 END
      ), 0)::text AS total_pending,
      COUNT(DISTINCT sf.student_id) FILTER (WHERE sf.amount_due > sf.amount_paid)::text AS students_with_dues
     FROM student_fees sf
     JOIN students s ON sf.student_id = s.id
     LEFT JOIN fee_structures fs ON sf.fee_structure_id = fs.id
     WHERE s.status = 'active'
       AND sf.academic_year = $1
       AND sf.amount_due > sf.amount_paid
       ${EXCLUDE_INACTIVE_OUTSTANDING_FEES}`,
    [academicYear],
  );

  const row = result.rows[0];
  return {
    total: parseFloat(row?.total_pending || '0'),
    students_with_dues: parseInt(row?.students_with_dues || '0', 10),
  };
}
