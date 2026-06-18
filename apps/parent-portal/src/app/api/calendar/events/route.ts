import { NextRequest, NextResponse } from 'next/server'
import { getRequestDbOrError } from '@/lib/request-db'
import { requireParentSession } from '@/lib/parent-auth'
import { fetchAllCalendarEvents, fetchCalendarEventsInRange } from '@/lib/school-calendar'

export async function GET(request: NextRequest) {
  try {
    const auth = requireParentSession(request)
    if (auth instanceof NextResponse) return auth

    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    const searchParams = request.nextUrl.searchParams
    const scope = searchParams.get('scope')

    if (scope === 'all') {
      const data = await fetchAllCalendarEvents(db, { parentVisibleOnly: true })
      return NextResponse.json({ success: true, data })
    }

    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    let rangeStart = startDate
    let rangeEnd = endDate

    if (year && month) {
      const y = parseInt(year, 10)
      const m = parseInt(month, 10)
      if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
        return NextResponse.json(
          { success: false, error: 'Invalid year or month' },
          { status: 400 },
        )
      }
      rangeStart = `${y}-${String(m).padStart(2, '0')}-01`
      const lastDay = new Date(y, m, 0).getDate()
      rangeEnd = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    }

    if (!rangeStart || !rangeEnd) {
      return NextResponse.json(
        { success: false, error: 'start_date and end_date are required' },
        { status: 400 },
      )
    }

    const data = await fetchCalendarEventsInRange(db, rangeStart, rangeEnd, {
      parentVisibleOnly: true,
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Parent calendar events error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch calendar events' },
      { status: 500 },
    )
  }
}
