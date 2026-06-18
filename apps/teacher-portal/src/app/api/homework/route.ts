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
    const subjectId = request.nextUrl.searchParams.get('subject_id')

    let query = `
      SELECT h.*, c.name AS class_name, s.name AS subject_name,
        (SELECT COUNT(*) FROM homework_submissions hs WHERE hs.homework_id = h.id) AS total_submissions,
        (SELECT COUNT(*) FROM homework_submissions hs WHERE hs.homework_id = h.id AND hs.status != 'pending') AS submitted_count
      FROM homework h
      LEFT JOIN classes c ON h.class_id = c.id
      LEFT JOIN subjects s ON h.subject_id = s.id
      WHERE h.assigned_by = $1`
    const params: number[] = [auth.user.id]

    if (classId) {
      params.push(parseInt(classId, 10))
      query += ` AND h.class_id = $${params.length}`
    }
    if (subjectId) {
      params.push(parseInt(subjectId, 10))
      query += ` AND h.subject_id = $${params.length}`
    }

    query += ' ORDER BY h.due_date DESC, h.created_at DESC'

    const result = await db.query(query, params)
    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Homework fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch homework' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
    const { class_id, subject_id, title, description, due_date, total_marks, section_id } = body

    if (!class_id || !subject_id || !title || !due_date) {
      return NextResponse.json(
        { success: false, error: 'class_id, subject_id, title, and due_date are required' },
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

    const result = await db.query(
      `INSERT INTO homework (
        class_id, subject_id, title, description, due_date,
        total_marks, assigned_by, assigned_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        classIdNum,
        subject_id,
        title,
        description || null,
        due_date,
        total_marks || 100,
        auth.user.id,
      ],
    )

    const homeworkId = result.rows[0].id

    try {
      await db.query(`UPDATE homework SET status = 'active' WHERE id = $1`, [homeworkId])
    } catch {
      /* status column may not exist */
    }

    let studentsQuery = `SELECT id FROM students WHERE class_id = $1 AND status = 'active'`
    const studentParams: number[] = [classIdNum]
    if (sectionIdNum) {
      studentParams.push(sectionIdNum)
      studentsQuery += ` AND section_id = $${studentParams.length}`
    }

    const studentsResult = await db.query(studentsQuery, studentParams)

    for (const student of studentsResult.rows) {
      const existing = await db.query(
        'SELECT id FROM homework_submissions WHERE homework_id = $1 AND student_id = $2',
        [homeworkId, student.id],
      )
      if (!existing.rows.length) {
        await db.query(
          `INSERT INTO homework_submissions (homework_id, student_id, status) VALUES ($1, $2, 'pending')`,
          [homeworkId, student.id],
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: `Homework assigned to ${studentsResult.rows.length} student(s)`,
    })
  } catch (error) {
    console.error('Homework create error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create homework' }, { status: 500 })
  }
}
