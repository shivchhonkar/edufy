import { NextRequest, NextResponse } from 'next/server'
import { getRequestDbOrError } from '@/lib/request-db'
import { requireStudentFromQuery, requireStudentFromParams } from '@/lib/parent-portal/require-student-api'
import { ensureParentMobileSchema } from '@/lib/ensure-parent-mobile-schema'

export async function GET(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    const authResult = requireStudentFromQuery(request)
    if (authResult instanceof NextResponse) return authResult
    const { studentId } = authResult

    await ensureParentMobileSchema(db)

    const result = await db.query(
      `SELECT id, category, subject, message, created_at
       FROM parent_feedback
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [studentId],
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Parent feedback error:', error)
    return NextResponse.json({ success: true, data: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    const body = await request.json()
    const studentId = Number(body.studentId)
    const subject = String(body.subject || '').trim()
    const message = String(body.message || '').trim()
    const category = String(body.category || 'general').trim() || 'general'
    if (!studentId || !subject || !message) {
      return NextResponse.json({ success: false, error: 'Student, subject, and message are required' }, { status: 400 })
    }

    const authResult = requireStudentFromParams(request, String(studentId))
    if (authResult instanceof NextResponse) return authResult

    await ensureParentMobileSchema(db)

    const saved = await db.query(
      `INSERT INTO parent_feedback (student_id, category, subject, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, category, subject, message, created_at`,
      [studentId, category, subject, message],
    )

    return NextResponse.json({ success: true, data: saved.rows[0] })
  } catch (error) {
    console.error('Parent feedback save error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save feedback' }, { status: 500 })
  }
}
