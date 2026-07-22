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

    if (!classId) {
      const result = await db.query(
        `SELECT DISTINCT ON (s.id)
          s.id, s.first_name, s.last_name, s.admission_number, s.roll_number,
          s.class_id, s.section_id,
          c.name AS class_name, sec.name AS section_name
        FROM students s
        INNER JOIN teacher_assignments ta ON ta.staff_id = $1
          AND ta.class_id = s.class_id
          AND (ta.section_id IS NULL OR ta.section_id = s.section_id)
        LEFT JOIN classes c ON s.class_id = c.id
        LEFT JOIN sections sec ON s.section_id = sec.id
        WHERE s.status = 'active'
        ORDER BY s.id, c.name, sec.name NULLS FIRST, s.roll_number NULLS LAST, s.first_name, s.last_name`,
        [staffId],
      )
      return NextResponse.json({ success: true, data: result.rows })
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
      SELECT s.id, s.first_name, s.last_name, s.admission_number, s.roll_number,
        c.name AS class_name, sec.name AS section_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN sections sec ON s.section_id = sec.id
      WHERE s.class_id = $1 AND s.status = 'active'`
    const params: number[] = [classIdNum]

    if (sectionIdNum) {
      params.push(sectionIdNum)
      query += ` AND s.section_id = $${params.length}`
    }

    query += ' ORDER BY s.roll_number NULLS LAST, s.first_name, s.last_name'

    const result = await db.query(query, params)
    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Students fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch students' }, { status: 500 })
  }
}
