import type { RequestDb } from '@/lib/request-db'
import { getCalendarDateString } from '@edulakhya/utils'

type StudentContext = {
  studentId: number
  classId: number | null
  sectionId: number | null
  academicYear: string
}

export async function getStudentContext(db: RequestDb, studentId: number): Promise<StudentContext | null> {
  const academicYearResult = await db.query<{ academic_year: string }>(
    'SELECT academic_year FROM system_settings ORDER BY id DESC LIMIT 1',
  )
  const academicYear = academicYearResult.rows[0]?.academic_year || '2025-26'

  const studentResult = await db.query<{ class_id: number | null; section_id: number | null }>(
    `SELECT
      COALESCE(e.class_id, s.class_id) AS class_id,
      COALESCE(e.section_id, s.section_id) AS section_id
     FROM students s
     LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
     WHERE s.id = $1`,
    [studentId],
  )

  if (!studentResult.rows.length) return null

  return {
    studentId,
    classId: studentResult.rows[0].class_id,
    sectionId: studentResult.rows[0].section_id,
    academicYear,
  }
}

export async function fetchAttendanceStats(db: RequestDb, studentId: number) {
  const now = new Date()
  const todayDate = getCalendarDateString(now)
  const currentMonth = Number(todayDate.slice(5, 7))
  const currentYear = Number(todayDate.slice(0, 4))

  const monthResult = await db.query<{
    present_days: string
    absent_days: string
    late_days: string
    total_days: string
  }>(
    `SELECT
      COUNT(*) FILTER (WHERE status = 'present') AS present_days,
      COUNT(*) FILTER (WHERE status = 'absent') AS absent_days,
      COUNT(*) FILTER (WHERE status = 'late') AS late_days,
      COUNT(*) AS total_days
     FROM attendance
     WHERE student_id = $1
       AND EXTRACT(MONTH FROM date) = $2
       AND EXTRACT(YEAR FROM date) = $3`,
    [studentId, currentMonth, currentYear],
  )

  const row = monthResult.rows[0]
  const presentDays = Number(row?.present_days) || 0
  const absentDays = Number(row?.absent_days) || 0
  const lateDays = Number(row?.late_days) || 0
  const totalDays = Number(row?.total_days) || 0
  const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

  let todayStatus: string = 'not_marked'
  const todayResult = await db.query<{ status: string }>(
    `SELECT status FROM attendance WHERE student_id = $1 AND date = $2::date LIMIT 1`,
    [studentId, todayDate],
  )
  if (todayResult.rows[0]?.status) {
    todayStatus = todayResult.rows[0].status
  } else {
    const utcToday = new Date().toISOString().split('T')[0]
    if (utcToday !== todayDate) {
      const utcResult = await db.query<{ status: string }>(
        `SELECT status FROM attendance WHERE student_id = $1 AND date = $2::date LIMIT 1`,
        [studentId, utcToday],
      )
      if (utcResult.rows[0]?.status) todayStatus = utcResult.rows[0].status
    }
  }

  const trend: { label: string; percentage: number }[] = []
  try {
    const trendResult = await db.query<{ date: string; status: string }>(
      `SELECT date::text, status FROM attendance
       WHERE student_id = $1
       ORDER BY date DESC
       LIMIT 7`,
      [studentId],
    )
    trendResult.rows.reverse().forEach((entry) => {
      const d = new Date(entry.date)
      trend.push({
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3),
        percentage:
          entry.status === 'present' ? 100 : entry.status === 'late' ? 75 : entry.status === 'on_leave' ? 50 : 0,
      })
    })
  } catch {
    /* optional */
  }

  return {
    percentage,
    presentDays,
    absentDays,
    lateDays,
    totalDays,
    todayStatus,
    trend,
  }
}

export async function fetchFeeStats(db: RequestDb, studentId: number, academicYear: string) {
  const feesResult = await db.query<{
    pending_amount: string
    paid_amount: string
    total_due: string
    pending_count: string
    next_due_date: string | null
  }>(
    `SELECT
      COALESCE(SUM(amount_due - amount_paid + COALESCE(late_fee_amount, 0)), 0) AS pending_amount,
      COALESCE(SUM(amount_paid), 0) AS paid_amount,
      COALESCE(SUM(amount_due + COALESCE(late_fee_amount, 0)), 0) AS total_due,
      COUNT(*) FILTER (WHERE amount_due > amount_paid) AS pending_count,
      MIN(due_date) FILTER (WHERE amount_due > amount_paid AND due_date IS NOT NULL) AS next_due_date
     FROM student_fees
     WHERE student_id = $1 AND academic_year = $2`,
    [studentId, academicYear],
  )

  const row = feesResult.rows[0]
  const pending = Number(row?.pending_amount) || 0
  const paid = Number(row?.paid_amount) || 0
  const total = Number(row?.total_due) || pending + paid

  return {
    total,
    paid,
    pending,
    pendingCount: Number(row?.pending_count) || 0,
    nextDueDate: row?.next_due_date || null,
    paidPercent: total > 0 ? Math.round((paid / total) * 100) : 0,
  }
}

export async function fetchHomeworkStats(db: RequestDb, studentId: number, classId: number | null) {
  if (!classId) {
    return { pending: 0, dueToday: 0, recent: [] as Record<string, unknown>[] }
  }

  const statsResult = await db.query<{ pending: string; due_today: string }>(
    `SELECT
      COUNT(*) FILTER (WHERE COALESCE(hs.status, 'pending') = 'pending') AS pending,
      COUNT(*) FILTER (
        WHERE COALESCE(hs.status, 'pending') = 'pending'
          AND h.due_date::date = $3::date
      ) AS due_today
     FROM homework h
     LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = $1
     WHERE h.class_id = $2`,
    [studentId, classId, getCalendarDateString()],
  )

  const recentResult = await db.query(
    `SELECT h.id, h.title, h.due_date, s.name AS subject_name,
            COALESCE(hs.status, 'pending') AS submission_status
     FROM homework h
     LEFT JOIN subjects s ON h.subject_id = s.id
     LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = $1
     WHERE h.class_id = $2
     ORDER BY h.due_date ASC NULLS LAST, h.created_at DESC
     LIMIT 3`,
    [studentId, classId],
  )

  return {
    pending: Number(statsResult.rows[0]?.pending) || 0,
    dueToday: Number(statsResult.rows[0]?.due_today) || 0,
    recent: recentResult.rows,
  }
}

export async function fetchUpcomingExam(db: RequestDb, studentId: number, classId: number | null) {
  if (!classId) return null

  try {
    const result = await db.query<{ name: string; start_date: string; end_date: string }>(
      `SELECT name, start_date::text, end_date::text
       FROM exams
       WHERE (class_id = $1 OR class_id IS NULL)
         AND end_date >= CURRENT_DATE
       ORDER BY start_date ASC
       LIMIT 1`,
      [classId],
    )
    return result.rows[0] || null
  } catch {
    return null
  }
}

export async function fetchLatestNotice(db: RequestDb) {
  try {
    const circular = await db.query<{ title: string; content: string; published_at: string }>(
      `SELECT title, content, COALESCE(published_at, created_at)::text AS published_at
       FROM school_circulars
       WHERE status = 'published'
         AND audience_type IN ('parents', 'all', 'students_parents')
       ORDER BY published_at DESC NULLS LAST
       LIMIT 1`,
    )
    if (circular.rows[0]) return circular.rows[0]
  } catch {
    /* table may not exist */
  }

  try {
    const announcements = await db.query<{ title: string; content: string; created_at: string }>(
      `SELECT title, content, created_at::text
       FROM announcements
       WHERE target_audience IN ('all', 'parents')
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    return announcements.rows[0]
      ? {
          title: announcements.rows[0].title,
          content: announcements.rows[0].content,
          published_at: announcements.rows[0].created_at,
        }
      : null
  } catch {
    return null
  }
}

export async function fetchUpcomingEvents(db: RequestDb) {
  try {
    const { fetchUpcomingCalendarEvents } = await import('@/lib/school-calendar')
    const events = await fetchUpcomingCalendarEvents(db, 3)
    return events.map((event) => ({
      title: event.title,
      content: event.description || undefined,
      start_date: event.start_date,
      event_type: event.event_type,
      kind: event.kind,
      start_time: event.start_time,
      all_day: event.all_day,
    }))
  } catch {
    return []
  }
}

export async function fetchTransportInfo(db: RequestDb, studentId: number) {
  try {
    const result = await db.query<{
      route_name: string
      stop_name: string
      vehicle_number: string | null
    }>(
      `SELECT r.route_name, rs.stop_name, v.vehicle_number
       FROM student_transport st
       LEFT JOIN routes r ON st.route_id = r.id
       LEFT JOIN route_stops rs ON st.stop_id = rs.id
       LEFT JOIN LATERAL (
         SELECT va.vehicle_id FROM vehicle_assignments va
         WHERE va.route_id = st.route_id AND va.status = 'active'
         ORDER BY va.assigned_date DESC
         LIMIT 1
       ) active_va ON true
       LEFT JOIN vehicles v ON v.id = active_va.vehicle_id
       WHERE st.student_id = $1 AND st.status = 'active'
       LIMIT 1`,
      [studentId],
    )
    return result.rows[0] || null
  } catch {
    return null
  }
}

export async function fetchTodaySchedule(
  db: RequestDb,
  classId: number | null,
  sectionId: number | null,
  academicYear: string,
) {
  if (!classId) return []

  const dayOfWeek = new Date().getDay()

  try {
    const result = await db.query<{
      period_name: string
      start_time: string
      end_time: string
      subject_name: string | null
      room: string | null
    }>(
      `SELECT tp.name AS period_name,
              tp.start_time::text,
              tp.end_time::text,
              sub.name AS subject_name,
              ct.room
       FROM class_timetable ct
       JOIN timetable_periods tp ON ct.period_id = tp.id
       LEFT JOIN subjects sub ON ct.subject_id = sub.id
       WHERE ct.class_id = $1
         AND (ct.section_id = $2 OR ct.section_id IS NULL)
         AND ct.day_of_week = $3
         AND (ct.academic_year IS NULL OR ct.academic_year = $4)
       ORDER BY tp.sort_order, tp.start_time`,
      [classId, sectionId, dayOfWeek, academicYear],
    )
    return result.rows
  } catch {
    return []
  }
}

export async function fetchUnreadNoticesCount(db: RequestDb) {
  try {
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM school_notifications
       WHERE status = 'active'
         AND audience_type IN ('parents', 'all', 'students_parents')`,
    )
    return Number(result.rows[0]?.count) || 0
  } catch {
    return 0
  }
}
