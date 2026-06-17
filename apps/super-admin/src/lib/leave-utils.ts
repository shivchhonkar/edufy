export function countWorkingDays(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return 0

  let count = 0
  const cur = new Date(s)
  while (cur <= e) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export function formatDateOnly(value: string | Date): string {
  if (typeof value === 'string') return value.split('T')[0]
  return value.toISOString().split('T')[0]
}

export type DbClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
}

export async function hasOverlappingLeave(
  db: DbClient,
  staffId: number,
  startDate: string,
  endDate: string,
  excludeId?: number,
): Promise<boolean> {
  const params: (number | string)[] = [staffId, startDate, endDate]
  let excludeClause = ''
  if (excludeId) {
    params.push(excludeId)
    excludeClause = ` AND id != $${params.length}`
  }

  const result = await db.query(
    `SELECT id FROM staff_leaves
     WHERE staff_id = $1
       AND status IN ('pending', 'approved')
       AND start_date <= $3 AND end_date >= $2
       ${excludeClause}
     LIMIT 1`,
    params,
  )
  return result.rows.length > 0
}

export async function getLeaveBalanceRemaining(
  db: DbClient,
  staffId: number,
  leaveTypeId: number,
  year: number,
): Promise<{ allocated: number; used: number; remaining: number; maxDays: number | null }> {
  const typeResult = await db.query('SELECT max_days_per_year FROM leave_types WHERE id = $1', [leaveTypeId])
  const maxDays = typeResult.rows[0]?.max_days_per_year as number | null
  const allocated = maxDays ?? 0

  const balanceResult = await db.query(
    `SELECT allocated, used, carried_forward FROM leave_balances
     WHERE staff_id = $1 AND leave_type_id = $2 AND year = $3`,
    [staffId, leaveTypeId, year],
  )

  let used = 0
  let effectiveAllocated = allocated

  if (balanceResult.rows.length) {
    const row = balanceResult.rows[0]
    used = Number(row.used || 0)
    effectiveAllocated = Number(row.allocated || 0) + Number(row.carried_forward || 0) || allocated
  } else {
    const approvedResult = await db.query(
      `SELECT COALESCE(SUM(days_requested), 0)::int AS used
       FROM staff_leaves
       WHERE staff_id = $1 AND leave_type_id = $2
         AND status = 'approved' AND EXTRACT(YEAR FROM start_date) = $3`,
      [staffId, leaveTypeId, year],
    )
    used = Number(approvedResult.rows[0]?.used || 0)
  }

  const remaining = maxDays != null ? Math.max(effectiveAllocated - used, 0) : Infinity
  return { allocated: effectiveAllocated, used, remaining, maxDays }
}

export async function syncLeaveToAttendance(
  db: DbClient,
  staffId: number,
  startDate: string,
  endDate: string,
) {
  const cur = new Date(startDate)
  const end = new Date(endDate)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) {
      const dateStr = formatDateOnly(cur)
      await db.query(
        `INSERT INTO staff_attendance (staff_id, attendance_date, status, attendance_type, remarks)
         VALUES ($1, $2, 'on_leave', 'manual', 'Auto-marked from approved leave')
         ON CONFLICT (staff_id, attendance_date)
         DO UPDATE SET status = 'on_leave', updated_at = CURRENT_TIMESTAMP`,
        [staffId, dateStr],
      )
    }
    cur.setDate(cur.getDate() + 1)
  }
}

export async function clearLeaveFromAttendance(
  db: DbClient,
  staffId: number,
  startDate: string,
  endDate: string,
) {
  await db.query(
    `UPDATE staff_attendance
     SET status = 'absent', remarks = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE staff_id = $1
       AND attendance_date BETWEEN $2 AND $3
       AND status = 'on_leave'
       AND remarks = 'Auto-marked from approved leave'`,
    [staffId, startDate, endDate],
  )
}
