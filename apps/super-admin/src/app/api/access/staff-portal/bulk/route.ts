import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDb } from '@/lib/request-db'
import { ensureAccessSchema } from '@/lib/ensure-access-schema'

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request)
    if (authResult instanceof NextResponse) return authResult
    const { db } = authResult

    await ensureAccessSchema(db)
    const { department_id, staff_ids, portal_access_enabled, portal_permissions } = await request.json()

    if (!department_id && (!staff_ids || !Array.isArray(staff_ids) || staff_ids.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'department_id or staff_ids is required' },
        { status: 400 },
      )
    }

    let updated = 0
    if (department_id) {
      const result = await db.query(
        `UPDATE staff SET
           portal_access_enabled = COALESCE($1, portal_access_enabled),
           portal_permissions = CASE WHEN $2::jsonb IS NULL THEN portal_permissions ELSE $2::jsonb END,
           updated_at = CURRENT_TIMESTAMP
         WHERE department_id = $3 AND status = 'active'
         RETURNING id`,
        [
          portal_access_enabled ?? null,
          portal_permissions ? JSON.stringify(portal_permissions) : null,
          parseInt(String(department_id), 10),
        ],
      )
      updated = result.rows.length
    } else {
      const ids = staff_ids.map((id: number) => parseInt(String(id), 10)).filter(Boolean)
      const result = await db.query(
        `UPDATE staff SET
           portal_access_enabled = COALESCE($1, portal_access_enabled),
           portal_permissions = CASE WHEN $2::jsonb IS NULL THEN portal_permissions ELSE $2::jsonb END,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($3::int[]) AND status = 'active'
         RETURNING id`,
        [
          portal_access_enabled ?? null,
          portal_permissions ? JSON.stringify(portal_permissions) : null,
          ids,
        ],
      )
      updated = result.rows.length
    }

    return NextResponse.json({
      success: true,
      message: `Updated ESS access for ${updated} staff member(s)`,
      data: { updated },
    })
  } catch (error) {
    console.error('Bulk staff portal access error:', error)
    return NextResponse.json({ success: false, error: 'Failed to bulk update' }, { status: 500 })
  }
}
