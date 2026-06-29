import { NextRequest, NextResponse } from 'next/server'
import { getRequestDbOrError } from '@/lib/request-db'
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api'
import {
  fetchAttendanceStats,
  fetchFeeStats,
  fetchHomeworkStats,
  fetchLatestNotice,
  fetchTodaySchedule,
  fetchTransportInfo,
  fetchUnreadNoticesCount,
  fetchUpcomingEvents,
  fetchUpcomingExam,
  getStudentContext,
} from '@/lib/parent-portal/dashboard-stats'
import { fetchParentNotifications } from '@/lib/parent-portal/parent-notifications'

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

    const [
      attendance,
      fees,
      homework,
      exam,
      notice,
      events,
      transport,
      schedule,
      unreadNotices,
      notifications,
    ] = await Promise.all([
      fetchAttendanceStats(db, studentId),
      fetchFeeStats(db, studentId, ctx.academicYear),
      fetchHomeworkStats(db, studentId, ctx.classId),
      fetchUpcomingExam(db, studentId, ctx.classId),
      fetchLatestNotice(db, ctx.classId, ctx.sectionId),
      fetchUpcomingEvents(db),
      fetchTransportInfo(db, studentId),
      fetchTodaySchedule(db, ctx.classId, ctx.sectionId, ctx.academicYear),
      fetchUnreadNoticesCount(db, ctx.classId, ctx.sectionId),
      fetchParentNotifications(db, ctx.classId, ctx.sectionId, 5),
    ])

    return NextResponse.json({
      success: true,
      data: {
        attendance: {
          percentage: `${attendance.percentage}%`,
          presentDays: attendance.presentDays,
          absentDays: attendance.absentDays,
          lateDays: attendance.lateDays,
          totalDays: attendance.totalDays,
          todayStatus: attendance.todayStatus,
          trend: attendance.trend,
        },
        fees: {
          total: fees.total,
          paid: fees.paid,
          pending: fees.pending,
          pendingCount: fees.pendingCount,
          nextDueDate: fees.nextDueDate,
          paidPercent: fees.paidPercent,
        },
        homework: {
          pending: homework.pending,
          dueToday: homework.dueToday,
          recent: homework.recent,
        },
        exam,
        notice,
        events,
        transport,
        schedule,
        unreadNotices,
        notifications,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard stats'
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
