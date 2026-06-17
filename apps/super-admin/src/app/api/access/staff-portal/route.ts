import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDb } from '@/lib/request-db'
import {
  defaultStaffPermissions,
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
      defaultStaffPermissions(),
      permissionsFromDb(settings?.staff_portal_defaults),
    )

    const { searchParams } = request.nextUrl
    const departmentId = searchParams.get('department_id')
    const search = searchParams.get('search')?.trim()
    const accessStatus = searchParams.get('access_status')

    let query = `
      SELECT
        s.id,
        s.first_name,
        s.last_name,
        s.employee_id,
        s.email,
        s.user_id,
        s.portal_access_enabled,
        s.portal_permissions,
        COALESCE(u.email, u_email.email, s.email) AS login_email,
        (
          COALESCE(u.is_active, false) = true AND u.password_hash IS NOT NULL
        ) OR (
          COALESCE(u_email.is_active, false) = true AND u_email.password_hash IS NOT NULL
        ) AS has_login_password,
        COALESCE(d.name, s.department, 'Unassigned') AS department_name,
        des.name AS designation_name
      FROM staff s
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN users u_email ON s.user_id IS NULL
        AND s.email IS NOT NULL
        AND LOWER(u_email.email) = LOWER(s.email)
      LEFT JOIN departments d ON s.department_id = d.id
      LEFT JOIN designations des ON s.designation_id = des.id
      WHERE s.status = 'active'
    `
    const params: (string | number)[] = []

    if (departmentId) {
      params.push(parseInt(departmentId, 10))
      query += ` AND s.department_id = $${params.length}`
    }
    if (search) {
      params.push(`%${search}%`)
      const idx = params.length
      query += ` AND (
        s.first_name ILIKE $${idx} OR s.last_name ILIKE $${idx}
        OR s.employee_id ILIKE $${idx} OR s.email ILIKE $${idx}
      )`
    }
    if (accessStatus === 'enabled') query += ' AND COALESCE(s.portal_access_enabled, true) = true'
    if (accessStatus === 'disabled') query += ' AND COALESCE(s.portal_access_enabled, true) = false'

    query += ' ORDER BY s.first_name, s.last_name LIMIT 300'

    const result = await db.query(query, params)
    const staff = result.rows.map((row: Record<string, unknown>) => ({
      ...row,
      effective_permissions: mergePermissions(
        defaults,
        permissionsFromDb(row.portal_permissions),
      ),
    }))

    return NextResponse.json({ success: true, data: { defaults, staff } })
  } catch (error) {
    console.error('Staff portal access GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to load staff access' }, { status: 500 })
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
        `UPDATE system_settings SET staff_portal_defaults = $1::jsonb, updated_at = CURRENT_TIMESTAMP
         WHERE id = (SELECT id FROM system_settings ORDER BY id DESC LIMIT 1)`,
        [JSON.stringify(body.defaults)],
      )
    }

    return NextResponse.json({ success: true, message: 'Default staff access updated' })
  } catch (error) {
    console.error('Staff portal access PUT error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update defaults' }, { status: 500 })
  }
}
