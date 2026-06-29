import { NextRequest, NextResponse } from 'next/server'
import { getRequestDbOrError } from '@/lib/request-db'
import {
  requireTeacherAuth,
  resolveStaffId,
  teacherHasClassAccess,
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

    const classId = request.nextUrl.searchParams.get('class_id')
    const sectionId = request.nextUrl.searchParams.get('section_id')
    const date = request.nextUrl.searchParams.get('date')

    if (!classId || !date) {
      return NextResponse.json(
        { success: false, error: 'class_id and date are required' },
        { status: 400 },
      )
    }

    const classIdNum = parseInt(classId, 10)
    const sectionIdNum = sectionId ? parseInt(sectionId, 10) : null

    const hasAccess = await teacherHasClassAccess(db, staffId, classIdNum, sectionIdNum)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You are not assigned to this class' },
        { status: 403 },
      )
    }

    let query = `
      SELECT a.*, s.first_name, s.last_name, s.admission_number, s.roll_number
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE s.class_id = $1 AND a.date = $2`
    const params: (string | number)[] = [classIdNum, date]

    if (sectionIdNum) {
      params.push(sectionIdNum)
      query += ` AND s.section_id = $${params.length}`
    }

    query += ' ORDER BY s.roll_number NULLS LAST, s.first_name'

    const result = await db.query(query, params)
    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Attendance fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch attendance' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { class_id, section_id, date, attendance_records } = body

    if (!class_id || !date || !Array.isArray(attendance_records)) {
      return NextResponse.json(
        { success: false, error: 'class_id, date, and attendance_records are required' },
        { status: 400 },
      )
    }

    const classIdNum = parseInt(String(class_id), 10)
    const sectionIdNum = section_id ? parseInt(String(section_id), 10) : null

    const hasAccess = await teacherHasClassAccess(db, staffId, classIdNum, sectionIdNum)
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You are not assigned to this class' },
        { status: 403 },
      )
    }

    await db.query('BEGIN')

    try {
      const results = []

      for (const record of attendance_records) {
        const { student_id, status, remarks } = record
        if (!student_id) continue

        const existing = await db.query(
          'SELECT id FROM attendance WHERE student_id = $1 AND date = $2',
          [student_id, date],
        )

        if (existing.rows.length > 0) {
          const updated = await db.query(
            `UPDATE attendance SET status = $1, remarks = $2, marked_by = $3
             WHERE student_id = $4 AND date = $5 RETURNING *`,
            [status || 'present', remarks || null, auth.user.id, student_id, date],
          )
          results.push(updated.rows[0])
        } else {
          const inserted = await db.query(
            `INSERT INTO attendance (student_id, date, status, remarks, marked_by)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [student_id, date, status || 'present', remarks || null, auth.user.id],
          )
          results.push(inserted.rows[0])
        }
      }

      await db.query('COMMIT')

      return NextResponse.json({
        success: true,
        data: results,
        message: `Saved attendance for ${results.length} student(s)`,
      })
    } catch (error) {
      await db.query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Attendance save error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save attendance' }, { status: 500 })
  }
}
