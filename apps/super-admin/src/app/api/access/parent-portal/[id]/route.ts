import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDb } from '@/lib/request-db'
import { parseStudentId } from '@/lib/student-profile-api'
import { ensureAccessSchema } from '@/lib/ensure-access-schema'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authResult = await getAuthenticatedDb(request)
    if (authResult instanceof NextResponse) return authResult
    const { db } = authResult

    const studentId = parseStudentId(params.id)
    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Invalid student id' }, { status: 400 })
    }

    await ensureAccessSchema(db)
    const { portal_access_enabled, portal_permissions } = await request.json()

    const result = await db.query(
      `UPDATE students SET
         portal_access_enabled = COALESCE($1, portal_access_enabled),
         portal_permissions = COALESCE($2::jsonb, portal_permissions),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND status = 'active'
       RETURNING id`,
      [
        portal_access_enabled ?? null,
        portal_permissions ? JSON.stringify(portal_permissions) : null,
        studentId,
      ],
    )

    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Student portal access updated' })
  } catch (error) {
    console.error('Student portal access update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update access' }, { status: 500 })
  }
}
