import { NextRequest, NextResponse } from 'next/server'
import { getRequestDbOrError } from '@/lib/request-db'
import { requireTeacherAuth, resolveStaffId } from '@/lib/teacher-auth'
import { getLeaveBalanceRemaining } from '@/lib/teacher-portal/leave-utils'

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

    const year = parseInt(request.nextUrl.searchParams.get('year') || String(new Date().getFullYear()), 10)

    const typesResult = await db.query(
      `SELECT id, name, description, is_paid, max_days_per_year
       FROM leave_types WHERE is_active = true ORDER BY name`,
    )

    const balances = await Promise.all(
      typesResult.rows.map(async (type) => {
        const balance = await getLeaveBalanceRemaining(db, staffId, Number(type.id), year)
        return {
          ...type,
          allocated: balance.allocated,
          used: balance.used,
          remaining: balance.remaining,
        }
      }),
    )

    return NextResponse.json({ success: true, data: balances })
  } catch (error) {
    console.error('Leave types fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch leave types' }, { status: 500 })
  }
}
