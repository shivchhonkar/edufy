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

type DbClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
}

export async function hasOverlappingLeave(
  db: DbClient,
  staffId: number,
  startDate: string,
  endDate: string,
): Promise<boolean> {
  const result = await db.query(
    `SELECT id FROM staff_leaves
     WHERE staff_id = $1
       AND status IN ('pending', 'approved')
       AND start_date <= $3 AND end_date >= $2
     LIMIT 1`,
    [staffId, startDate, endDate],
  )
  return result.rows.length > 0
}

export async function getLeaveBalanceRemaining(
  db: DbClient,
  staffId: number,
  leaveTypeId: number,
  year: number,
): Promise<{ allocated: number; used: number; remaining: number; maxDays: number | null }> {
  const typeResult = await db.query('SELECT max_days_per_year FROM leave_types WHERE id = $1', [
    leaveTypeId,
  ])
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

  const remaining = Math.max(0, effectiveAllocated - used)
  return { allocated: effectiveAllocated, used, remaining, maxDays }
}
