import { NextRequest, NextResponse } from 'next/server'
import { getRequestDbOrError } from '@/lib/request-db'
import { requireStudentFromQuery } from '@/lib/require-student-api'
import { getStudentContext } from '@/lib/dashboard-stats'
import { fetchParentNotifications } from '@/lib/parent-notifications'

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    const authResult = requireStudentFromQuery(request)
    if (authResult instanceof NextResponse) return authResult
    const { studentId } = authResult

    const ctx = await getStudentContext(db, studentId)
    if (!ctx) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 })
    }

    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50', 10), 100)
    const notifications = await fetchParentNotifications(db, ctx.classId, ctx.sectionId, limit)

    return NextResponse.json({ success: true, data: notifications })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch notifications'
    console.error('Parent notifications error:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
