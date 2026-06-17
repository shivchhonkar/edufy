import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDb } from '@/lib/request-db'
import { ensureAccessSchema } from '@/lib/ensure-access-schema'

export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request)
    if (authResult instanceof NextResponse) return authResult
    const { db } = authResult

    await ensureAccessSchema(db)
    const { class_id, student_ids, portal_access_enabled, portal_permissions } = await request.json()

    if (!class_id && (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'class_id or student_ids is required' },
        { status: 400 },
      )
    }

    let updated = 0
    if (class_id) {
      const result = await db.query(
        `UPDATE students s SET
           portal_access_enabled = COALESCE($1, s.portal_access_enabled),
           portal_permissions = CASE WHEN $2::jsonb IS NULL THEN s.portal_permissions ELSE $2::jsonb END,
           updated_at = CURRENT_TIMESTAMP
         FROM student_enrollments e
         WHERE s.id = e.student_id AND e.is_current = true
           AND e.class_id = $3 AND s.status = 'active'
         RETURNING s.id`,
        [
          portal_access_enabled ?? null,
          portal_permissions ? JSON.stringify(portal_permissions) : null,
          parseInt(String(class_id), 10),
        ],
      )
      updated = result.rows.length
    } else {
      const ids = student_ids.map((id: number) => parseInt(String(id), 10)).filter(Boolean)
      const result = await db.query(
        `UPDATE students SET
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
      message: `Updated portal access for ${updated} student(s)`,
      data: { updated },
    })
  } catch (error) {
    console.error('Bulk parent portal access error:', error)
    return NextResponse.json({ success: false, error: 'Failed to bulk update' }, { status: 500 })
  }
}
