import { NextRequest, NextResponse } from 'next/server'
import { getRequestDbOrError } from '@/lib/request-db'
import { requireStudentFromQuery } from '@/lib/parent-portal/require-student-api'
import { ensureStudentOperationsSchema } from '@/lib/ensure-student-operations-schema'

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    const authResult = requireStudentFromQuery(request)
    if (authResult instanceof NextResponse) return authResult
    const { studentId } = authResult

    await ensureStudentOperationsSchema(db)

    const attendance = await db.query(
      `SELECT id, date, status, remarks
       FROM attendance
       WHERE student_id = $1
         AND remarks IS NOT NULL
         AND TRIM(remarks) <> ''
       ORDER BY date DESC
       LIMIT 50`,
      [studentId],
    ).catch(() => ({ rows: [] }))

    const interactions = await db.query(
      `SELECT id, interaction_type, interaction_date, subject, description, status, created_by_name
       FROM student_interactions
       WHERE student_id = $1
       ORDER BY interaction_date DESC, id DESC
       LIMIT 50`,
      [studentId],
    ).catch(() => ({ rows: [] }))

    const items = [
      ...attendance.rows.map((row: Record<string, unknown>) => ({
        id: `attendance-${row.id}`,
        kind: 'Attendance',
        date: row.date,
        title: String(row.status || 'Attendance'),
        body: row.remarks,
      })),
      ...interactions.rows.map((row: Record<string, unknown>) => ({
        id: `interaction-${row.id}`,
        kind: String(row.interaction_type || 'Remark').replace(/_/g, ' '),
        date: row.interaction_date,
        title: row.subject,
        body: row.description,
        status: row.status,
        by: row.created_by_name,
      })),
    ]

    return NextResponse.json({ success: true, data: items })
  } catch (error) {
    console.error('Parent remarks error:', error)
    return NextResponse.json({ success: true, data: [] })
  }
}
