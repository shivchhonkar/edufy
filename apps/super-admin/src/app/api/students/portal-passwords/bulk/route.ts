import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAuthenticatedDb } from '@/lib/request-db'
import { ensureStudentPortalSchema } from '@/lib/ensure-student-portal-schema'

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request)
    if (authResult instanceof NextResponse) return authResult
    const { db } = authResult

    const body = await request.json()
    const { class_id, student_ids, password, use_admission_as_password } = body

    if (!class_id && (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'class_id or student_ids is required' },
        { status: 400 },
      )
    }

    if (!use_admission_as_password && (!password || String(password).length < 6)) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 },
      )
    }

    await ensureStudentPortalSchema(db)

    let rows: { id: number; admission_number: string }[] = []

    if (class_id) {
      const studentsResult = await db.query(
        `SELECT s.id, s.admission_number
         FROM students s
         LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
         WHERE s.status = 'active'
           AND COALESCE(e.class_id, s.class_id) = $1`,
        [parseInt(String(class_id), 10)],
      )
      rows = studentsResult.rows as { id: number; admission_number: string }[]
    } else {
      const ids = student_ids.map((id: number) => parseInt(String(id), 10)).filter(Boolean)
      const studentsResult = await db.query(
        `SELECT s.id, s.admission_number FROM students s WHERE s.status = 'active' AND s.id = ANY($1::int[])`,
        [ids],
      )
      rows = studentsResult.rows as { id: number; admission_number: string }[]
    }

    if (!rows.length) {
      return NextResponse.json({ success: false, error: 'No students found' }, { status: 404 })
    }

    let updated = 0
    for (const row of rows) {
      const plain =
        use_admission_as_password && row.admission_number
          ? String(row.admission_number)
          : String(password)
      const passwordHash = await bcrypt.hash(plain, 10)
      await db.query(
        `UPDATE students
         SET portal_password_hash = $1, portal_password_set_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [passwordHash, row.id],
      )
      updated++
    }

    return NextResponse.json({
      success: true,
      message: `Portal password set for ${updated} student(s)`,
      data: { updated },
    })
  } catch (error) {
    console.error('Bulk portal password error:', error)
    return NextResponse.json({ success: false, error: 'Failed to set passwords' }, { status: 500 })
  }
}
