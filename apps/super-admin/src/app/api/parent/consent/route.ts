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

    const student = await db.query(
      `SELECT COALESCE(e.class_id, s.class_id) AS class_id,
              COALESCE(e.section_id, s.section_id) AS section_id
       FROM students s
       LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
       WHERE s.id = $1`,
      [studentId],
    )
    const ctx = student.rows[0] as { class_id?: number | null; section_id?: number | null } | undefined

    const result = await db.query(
      `SELECT f.id, f.title, f.description, f.due_date, f.status,
              r.decision, r.note, r.responded_at
       FROM parent_consent_forms f
       LEFT JOIN parent_consent_responses r
         ON r.form_id = f.id AND r.student_id = $1
       WHERE f.status = 'open'
         AND (f.class_id IS NULL OR f.class_id = $2)
         AND (f.section_id IS NULL OR f.section_id = $3)
       ORDER BY f.due_date NULLS LAST, f.id DESC`,
      [studentId, ctx?.class_id ?? null, ctx?.section_id ?? null],
    )

    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Parent consent error:', error)
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
    const formId = Number(body.formId)
    const decision = String(body.decision || '').toLowerCase()
    if (!studentId || !formId || !['yes', 'no'].includes(decision)) {
      return NextResponse.json({ success: false, error: 'Student, form, and yes/no decision are required' }, { status: 400 })
    }

    const authResult = requireStudentFromParams(request, String(studentId))
    if (authResult instanceof NextResponse) return authResult

    await ensureParentMobileSchema(db)

    const saved = await db.query(
      `INSERT INTO parent_consent_responses (form_id, student_id, decision, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (form_id, student_id)
       DO UPDATE SET decision = EXCLUDED.decision, note = EXCLUDED.note, responded_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [formId, studentId, decision, body.note ? String(body.note) : null],
    )

    return NextResponse.json({ success: true, data: saved.rows[0] })
  } catch (error) {
    console.error('Parent consent save error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save consent' }, { status: 500 })
  }
}
