import { NextRequest, NextResponse } from 'next/server'
import { getRequestDbOrError } from '@/lib/request-db'
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api'
import { ensureTeacherPedagogySchema } from '@/lib/ensure-teacher-pedagogy-schema'

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    const authResult = requireStudentFromQuery(request)
    if (authResult instanceof NextResponse) return authResult
    const { studentId } = authResult

    await ensureTeacherPedagogySchema(db)

    const student = await db.query(
      `SELECT COALESCE(e.class_id, s.class_id) AS class_id,
              COALESCE(e.section_id, s.section_id) AS section_id
       FROM students s
       LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
       WHERE s.id = $1`,
      [studentId],
    )
    const row = student.rows[0] as { class_id?: number; section_id?: number | null } | undefined
    if (!row?.class_id) {
      return NextResponse.json({ success: true, data: [] })
    }

    const result = await db.query(
      `SELECT a.id, a.activity_date, a.topic_covered, a.periods_taught,
              a.homework_given, a.remarks, a.status,
              st.first_name || ' ' || st.last_name AS teacher_name,
              sub.name AS subject_name
       FROM teacher_daily_activities a
       LEFT JOIN staff st ON a.staff_id = st.id
       LEFT JOIN subjects sub ON a.subject_id = sub.id
       WHERE a.class_id = $1
         AND (a.section_id IS NULL OR a.section_id = $2 OR $2 IS NULL)
       ORDER BY a.activity_date DESC, a.id DESC
       LIMIT 100`,
      [row.class_id, row.section_id],
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Parent diary error:', error)
    return NextResponse.json({ success: true, data: [] })
  }
}
