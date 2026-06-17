import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDb } from '@/lib/request-db'
import {
  defaultParentPermissions,
  mergePermissions,
  permissionsFromDb,
} from '@/lib/portal-access'
import { ensureAccessSchema, getSystemSettingsRow } from '@/lib/ensure-access-schema'

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request)
    if (authResult instanceof NextResponse) return authResult
    const { db } = authResult

    await ensureAccessSchema(db)
    const settings = await getSystemSettingsRow(db)
    const defaults = mergePermissions(
      defaultParentPermissions(),
      permissionsFromDb(settings?.parent_portal_defaults),
    )

    const { searchParams } = request.nextUrl
    const classId = searchParams.get('class_id')
    const search = searchParams.get('search')?.trim()
    const accessStatus = searchParams.get('access_status')

    let query = `
      SELECT
        s.id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.parent_phone,
        s.portal_access_enabled,
        s.portal_permissions,
        (s.portal_password_hash IS NOT NULL) AS has_portal_password,
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
        s.first_name ILIKE $${idx} OR s.last_name ILIKE $${idx}
        OR s.admission_number ILIKE $${idx} OR s.parent_phone ILIKE $${idx}
      )`
    }
    if (accessStatus === 'enabled') query += ' AND COALESCE(s.portal_access_enabled, true) = true'
    if (accessStatus === 'disabled') query += ' AND COALESCE(s.portal_access_enabled, true) = false'

    query += ' ORDER BY s.first_name, s.last_name LIMIT 300'

    const result = await db.query(query, params)
    const students = result.rows.map((row: Record<string, unknown>) => ({
      ...row,
      effective_permissions: mergePermissions(
        defaults,
        permissionsFromDb(row.portal_permissions),
      ),
    }))

    return NextResponse.json({ success: true, data: { defaults, students } })
  } catch (error) {
    console.error('Parent portal access GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load access settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request)
    if (authResult instanceof NextResponse) return authResult
    const { db } = authResult

    await ensureAccessSchema(db)
    const body = await request.json()

    if (body.defaults) {
      await db.query(
        `UPDATE system_settings SET parent_portal_defaults = $1::jsonb, updated_at = CURRENT_TIMESTAMP
         WHERE id = (SELECT id FROM system_settings ORDER BY id DESC LIMIT 1)`,
        [JSON.stringify(body.defaults)],
      )
    }

    return NextResponse.json({ success: true, message: 'Default portal access updated' })
  } catch (error) {
    console.error('Parent portal access PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update defaults' }, { status: 500 })
  }
}
