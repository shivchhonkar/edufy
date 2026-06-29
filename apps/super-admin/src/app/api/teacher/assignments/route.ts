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

    const academicYear = request.nextUrl.searchParams.get('academic_year')

    let query = `
      SELECT ta.*, c.name AS class_name, sec.name AS section_name, sub.name AS subject_name
      FROM teacher_assignments ta
      LEFT JOIN classes c ON ta.class_id = c.id
      LEFT JOIN sections sec ON ta.section_id = sec.id
      LEFT JOIN subjects sub ON ta.subject_id = sub.id
      WHERE ta.staff_id = $1`
    const params: (string | number)[] = [staffId]

    if (academicYear) {
      params.push(academicYear)
      query += ` AND ta.academic_year = $${params.length}`
    }

    query += ' ORDER BY c.name, sec.name, sub.name'

    const result = await db.query(query, params)
    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Assignments fetch error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch assignments' }, { status: 500 })
  }
}
