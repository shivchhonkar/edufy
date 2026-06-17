import { NextRequest, NextResponse } from 'next/server'
import { getRequestDb } from '@/lib/request-db'
import { ensureHrSchema } from '@/lib/ensure-hr-schema'
import { requireHrAdmin, requireHrRead, getStaffIdForUser } from '@/lib/hr-auth'
import {
  countWorkingDays,
  clearLeaveFromAttendance,
  getLeaveBalanceRemaining,
  hasOverlappingLeave,
  syncLeaveToAttendance,
} from '@/lib/leave-utils'

const LEAVE_DETAIL_SELECT = `
  SELECT sl.*, lt.name AS leave_type_name, lt.is_paid, lt.max_days_per_year,
    s.first_name, s.last_name, s.employee_id, s.email,
    COALESCE(d.name, s.department, 'Unassigned') AS department_name,
    ab.first_name || ' ' || ab.last_name AS approved_by_name
  FROM staff_leaves sl
  JOIN staff s ON sl.staff_id = s.id
  LEFT JOIN leave_types lt ON sl.leave_type_id = lt.id
  LEFT JOIN departments d ON s.department_id = d.id
  LEFT JOIN staff ab ON sl.approved_by = ab.id
  WHERE sl.id = $1`

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = requireHrRead(request)
    if (auth instanceof NextResponse) return auth

    const { db } = await getRequestDb(request)
    await ensureHrSchema(db)

    const result = await db.query(LEAVE_DETAIL_SELECT, [params.id])
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Leave not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Leave fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch leave' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = requireHrAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { db } = await getRequestDb(request)
    await ensureHrSchema(db)

    const existing = await db.query('SELECT * FROM staff_leaves WHERE id = $1', [params.id])
    if (!existing.rows.length) {
      return NextResponse.json({ success: false, error: 'Leave not found' }, { status: 404 })
    }

    const row = existing.rows[0] as {
      id: number
      staff_id: number
      leave_type_id: number
      status: string
    }

    if (row.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Only pending leave requests can be edited' },
        { status: 400 },
      )
    }

    const body = await request.json()
    const leave_type_id = body.leave_type_id ?? row.leave_type_id
    const start_date = body.start_date
    const end_date = body.end_date
    const reason = body.reason

    if (!start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'start_date and end_date are required' },
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

    if (await hasOverlappingLeave(db, row.staff_id, start_date, end_date, row.id)) {
      return NextResponse.json(
        { success: false, error: 'Staff already has a pending or approved leave for overlapping dates' },
        { status: 409 },
      )
    }

    const year = new Date(start_date).getFullYear()
    const balance = await getLeaveBalanceRemaining(db, row.staff_id, leave_type_id, year)
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
      `UPDATE staff_leaves
       SET leave_type_id = $1, start_date = $2, end_date = $3, days_requested = $4,
           reason = COALESCE($5, reason), updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [leave_type_id, start_date, end_date, daysRequested, reason ?? null, params.id],
    )

    return NextResponse.json({ success: true, data: result.rows[0] })
  } catch (error) {
    console.error('Leave update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update leave' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = requireHrAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { db } = await getRequestDb(request)
    await ensureHrSchema(db)

    const { action, remarks } = await request.json()
    if (!['approve', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    const leave = await db.query('SELECT * FROM staff_leaves WHERE id = $1', [params.id])
    if (!leave.rows.length) {
      return NextResponse.json({ success: false, error: 'Leave not found' }, { status: 404 })
    }

    const row = leave.rows[0] as {
      staff_id: number
      leave_type_id: number
      start_date: string
      end_date: string
      days_requested: number
      status: string
    }

    if (action === 'approve' || action === 'reject') {
      if (row.status !== 'pending') {
        return NextResponse.json(
          { success: false, error: `Cannot ${action} a leave that is already ${row.status}` },
          { status: 400 },
        )
      }
    }

    if (action === 'cancel' && !['pending', 'approved'].includes(row.status)) {
      return NextResponse.json(
        { success: false, error: `Cannot cancel a leave that is ${row.status}` },
        { status: 400 },
      )
    }

    if (action === 'reject' && !remarks?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 },
      )
    }

    if (action === 'approve') {
      const year = new Date(row.start_date).getFullYear()
      const balance = await getLeaveBalanceRemaining(db, row.staff_id, row.leave_type_id, year)
      if (balance.maxDays != null && row.days_requested > balance.remaining) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient leave balance. ${balance.remaining} day(s) remaining, ${row.days_requested} requested.`,
          },
          { status: 400 },
        )
      }
    }

    const statusMap = { approve: 'approved', reject: 'rejected', cancel: 'cancelled' }
    const newStatus = statusMap[action as keyof typeof statusMap]
    const approverStaffId = await getStaffIdForUser(db, auth.user.id)

    const result = await db.query(
      `UPDATE staff_leaves SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP,
        remarks = COALESCE($3, remarks), updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 RETURNING *`,
      [newStatus, approverStaffId, remarks?.trim() || null, params.id],
    )

    if (action === 'approve') {
      const year = new Date(row.start_date).getFullYear()
      await db.query(
        `INSERT INTO leave_balances (staff_id, leave_type_id, year, allocated, used)
         VALUES ($1, $2, $3,
           COALESCE((SELECT max_days_per_year FROM leave_types WHERE id = $2), 0), $4)
         ON CONFLICT (staff_id, leave_type_id, year)
         DO UPDATE SET used = leave_balances.used + $4`,
        [row.staff_id, row.leave_type_id, year, row.days_requested],
      )
      await syncLeaveToAttendance(db, row.staff_id, row.start_date, row.end_date)
    }

    if (action === 'cancel' && row.status === 'approved') {
      const year = new Date(row.start_date).getFullYear()
      await db.query(
        `UPDATE leave_balances SET used = GREATEST(used - $1, 0)
         WHERE staff_id = $2 AND leave_type_id = $3 AND year = $4`,
        [row.days_requested, row.staff_id, row.leave_type_id, year],
      )
      await clearLeaveFromAttendance(db, row.staff_id, row.start_date, row.end_date)
    }

    const detail = await db.query(LEAVE_DETAIL_SELECT, [params.id])
    return NextResponse.json({ success: true, data: detail.rows[0] || result.rows[0] })
  } catch (error) {
    console.error('Leave action error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update leave' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = requireHrAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { db } = await getRequestDb(request)
    const result = await db.query(
      `DELETE FROM staff_leaves WHERE id = $1 AND status = 'pending' RETURNING id`,
      [params.id],
    )
    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Leave not found or not pending' }, { status: 404 })
    }
    return NextResponse.json({ success: true, message: 'Leave request deleted' })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to delete leave' }, { status: 500 })
  }
}
