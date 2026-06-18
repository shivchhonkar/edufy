import { NextRequest, NextResponse } from 'next/server'
import { getRequestDbOrError } from '@/lib/request-db'
import {
  requireTeacherAuth,
  resolveStaffId,
  ensureTeacherSchema,
} from '@/lib/teacher-auth'

export async function GET(request: NextRequest) {
  try {
    const auth = requireTeacherAuth(request)
    if (auth instanceof NextResponse) return auth

    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    await ensureTeacherSchema(db)

    const staffId = await resolveStaffId(db, auth.user.id)
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'No staff profile linked' }, { status: 404 })
    }

    const today = new Date().toISOString().split('T')[0]

    const [assignmentsRes, leavesRes, homeworkRes, attendanceRes] = await Promise.all([
      db.query(
        `SELECT COUNT(DISTINCT class_id) AS count FROM teacher_assignments WHERE staff_id = $1`,
        [staffId],
      ),
      db.query(
        `SELECT COUNT(*) AS count FROM staff_leaves WHERE staff_id = $1 AND status = 'pending'`,
        [staffId],
      ),
      db.query(
        `SELECT COUNT(*) AS count FROM homework WHERE assigned_by = $1 AND due_date >= CURRENT_DATE`,
        [auth.user.id],
      ),
      db.query(
        `SELECT COUNT(*) AS count FROM attendance a
         JOIN students s ON a.student_id = s.id
         WHERE a.date = $1 AND a.marked_by = $2`,
        [today, auth.user.id],
      ),
    ])

    return NextResponse.json({
      success: true,
      data: {
        assigned_classes: Number(assignmentsRes.rows[0]?.count || 0),
        pending_leaves: Number(leavesRes.rows[0]?.count || 0),
        active_homework: Number(homeworkRes.rows[0]?.count || 0),
        attendance_marked_today: Number(attendanceRes.rows[0]?.count || 0),
      },
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load stats' }, { status: 500 })
  }
}
