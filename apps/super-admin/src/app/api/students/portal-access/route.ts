import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDb } from '@/lib/request-db'
import { ensureStudentPortalSchema } from '@/lib/ensure-student-portal-schema'

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request)
    if (authResult instanceof NextResponse) return authResult
    const { db } = authResult

    await ensureStudentPortalSchema(db)

    const { searchParams } = request.nextUrl
    const classId = searchParams.get('class_id')
    const search = searchParams.get('search')?.trim()
    const portalStatus = searchParams.get('portal_status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500)

    let query = `
      SELECT
        s.id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.parent_phone,
        s.status,
        (s.portal_password_hash IS NOT NULL) AS has_portal_password,
        s.portal_password_set_at,
        COALESCE(c.name, c2.name) AS class_name,
        COALESCE(sec.name, sec2.name) AS section_name
      FROM students s
      LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
      LEFT JOIN classes c ON e.class_id = c.id
      LEFT JOIN sections sec ON e.section_id = sec.id
      LEFT JOIN classes c2 ON s.class_id = c2.id
      LEFT JOIN sections sec2 ON s.section_id = sec2.id
      WHERE s.status = 'active'
    `
    const params: (string | number)[] = []

    if (classId) {
      params.push(parseInt(classId, 10))
      query += ` AND COALESCE(e.class_id, s.class_id) = $${params.length}`
    }

    if (search) {
      params.push(`%${search}%`)
      const idx = params.length
      query += ` AND (
        s.first_name ILIKE $${idx}
        OR s.last_name ILIKE $${idx}
        OR s.admission_number ILIKE $${idx}
        OR s.parent_phone ILIKE $${idx}
      )`
    }

    if (portalStatus === 'set') {
      query += ' AND s.portal_password_hash IS NOT NULL'
    } else if (portalStatus === 'not_set') {
      query += ' AND s.portal_password_hash IS NULL'
    }

    params.push(limit)
    query += ` ORDER BY s.first_name, s.last_name LIMIT $${params.length}`

    const result = await db.query(query, params)
    return NextResponse.json({ success: true, data: result.rows })
  } catch (error) {
    console.error('Portal access list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch students' }, { status: 500 })
  }
}
