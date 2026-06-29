import { NextRequest, NextResponse } from 'next/server'
import { getRequestDbOrError } from '@/lib/request-db'
import { requireTeacherAuth, resolveStaffId } from '@/lib/teacher-auth'
import {
  countWorkingDays,
  hasOverlappingLeave,
  getLeaveBalanceRemaining,
} from '@/lib/teacher-portal/leave-utils'

export async function GET(request: NextRequest) {
  try {
    const auth = requireTeacherAuth(request)
    if (auth instanceof NextResponse) return auth

    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    const staffId = await resolveStaffId(db, auth.user.id)
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 })
    }

    const result = await db.query(
      `SELECT sl.*, lt.name AS leave_type_name
       FROM staff_leaves sl
       LEFT JOIN leave_types lt ON sl.leave_type_id = lt.id
       WHERE sl.staff_id = $1
       ORDER BY sl.created_at DESC`,
      [staffId],
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Leaves fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch leaves' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = requireTeacherAuth(request)
    if (auth instanceof NextResponse) return auth

    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    const staffId = await resolveStaffId(db, auth.user.id)
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 })
    }

    const { leave_type_id, start_date, end_date, reason } = await request.json()

    if (!leave_type_id || !start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'leave_type_id, start_date, and end_date are required' },
        { status: 400 },
      )
    }

    if (new Date(end_date) < new Date(start_date)) {
      return NextResponse.json(
        { success: false, error: 'End date must be on or after start date' },
        { status: 400 },
      )
    }

    const days = countWorkingDays(start_date, end_date)
    if (days <= 0) {
      return NextResponse.json(
        { success: false, error: 'Leave must include at least one working day' },
        { status: 400 },
      )
    }

    if (await hasOverlappingLeave(db, staffId, start_date, end_date)) {
      return NextResponse.json(
        { success: false, error: 'You already have a pending or approved leave for overlapping dates' },
        { status: 409 },
      )
    }

    const year = new Date(start_date).getFullYear()
    const balance = await getLeaveBalanceRemaining(db, staffId, leave_type_id, year)
    if (balance.maxDays != null && days > balance.remaining) {
      return NextResponse.json(
        { success: false, error: `Insufficient leave balance. ${balance.remaining} day(s) remaining.` },
        { status: 400 },
      )
    }

    const result = await db.query(
      `INSERT INTO staff_leaves (staff_id, leave_type_id, start_date, end_date, days_requested, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
      [staffId, leave_type_id, start_date, end_date, days, reason || null],
    )

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Leave application submitted successfully',
    })
  } catch (error) {
    console.error('Leave apply error:', error)
    return NextResponse.json({ success: false, error: 'Failed to apply for leave' }, { status: 500 })
  }
}
