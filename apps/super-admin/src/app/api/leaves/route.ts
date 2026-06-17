import { NextRequest, NextResponse } from 'next/server'
import { getRequestDb } from '@/lib/request-db'
import { ensureHrSchema } from '@/lib/ensure-hr-schema'
import { requireHrRead } from '@/lib/hr-auth'
import {
  countWorkingDays,
  getLeaveBalanceRemaining,
  hasOverlappingLeave,
} from '@/lib/leave-utils'

const LEAVE_SELECT = `
  SELECT sl.*, lt.name AS leave_type_name, lt.is_paid,
    s.first_name, s.last_name, s.employee_id,
    COALESCE(d.name, s.department, 'Unassigned') AS department_name,
    ab.first_name || ' ' || ab.last_name AS approved_by_name
  FROM staff_leaves sl
  JOIN staff s ON sl.staff_id = s.id
  LEFT JOIN leave_types lt ON sl.leave_type_id = lt.id
  LEFT JOIN departments d ON s.department_id = d.id
  LEFT JOIN staff ab ON sl.approved_by = ab.id`

export async function GET(request: NextRequest) {
  try {
    const auth = requireHrRead(request)
    if (auth instanceof NextResponse) return auth

    const { db } = await getRequestDb(request)
    await ensureHrSchema(db)

    const { searchParams } = request.nextUrl
    const staffId = searchParams.get('staff_id')
    const status = searchParams.get('status')
    const year = searchParams.get('year')
    const statsOnly = searchParams.get('stats') === 'true'

    if (statsOnly) {
      const statsResult = await db.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
          COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
          COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
        FROM staff_leaves
      `)
      return NextResponse.json({ success: true, data: statsResult.rows[0] })
    }

    let query = `${LEAVE_SELECT} WHERE 1=1`
    const params: (string | number)[] = []

    if (staffId) {
      params.push(parseInt(staffId, 10))
      query += ` AND sl.staff_id = $${params.length}`
    }
    if (status) {
      params.push(status)
      query += ` AND sl.status = $${params.length}`
    }
    if (year) {
      params.push(parseInt(year, 10))
      query += ` AND EXTRACT(YEAR FROM sl.start_date) = $${params.length}`
    }
    query += ' ORDER BY sl.created_at DESC'

    const result = await db.query(query, params)
    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Leaves fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch leaves' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireHrRead(request)
    if (auth instanceof NextResponse) return auth

    const { db } = await getRequestDb(request)
    await ensureHrSchema(db)

    const body = await request.json()
    const { staff_id, leave_type_id, start_date, end_date, reason } = body

    if (!staff_id || !leave_type_id || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'staff_id, leave_type_id, start_date, end_date required' },
        { status: 400 },
      )
    }

    if (new Date(end_date) < new Date(start_date)) {
      return NextResponse.json(
        { success: false, error: 'End date must be on or after start date' },
        { status: 400 },
      )
    }

    const daysRequested = countWorkingDays(start_date, end_date)
    if (daysRequested <= 0) {
      return NextResponse.json(
        { success: false, error: 'Leave must include at least one working day' },
        { status: 400 },
      )
    }

    if (await hasOverlappingLeave(db, staff_id, start_date, end_date)) {
      return NextResponse.json(
        { success: false, error: 'Staff already has a pending or approved leave for overlapping dates' },
        { status: 409 },
      )
    }

    const year = new Date(start_date).getFullYear()
    const balance = await getLeaveBalanceRemaining(db, staff_id, leave_type_id, year)
    if (balance.maxDays != null && daysRequested > balance.remaining) {
      return NextResponse.json(
        {
          success: false,
          error: `Insufficient leave balance. ${balance.remaining} day(s) remaining, ${daysRequested} requested.`,
        },
        { status: 400 },
      )
    }

    const result = await db.query(
      `INSERT INTO staff_leaves (staff_id, leave_type_id, start_date, end_date, days_requested, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [staff_id, leave_type_id, start_date, end_date, daysRequested, reason || null],
    )
    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Leave create error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create leave request' }, { status: 500 })
  }
}
