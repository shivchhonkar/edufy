import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getAuthenticatedDb } from '@/lib/request-db'
import { parseStudentId } from '@/lib/student-profile-api'
import { ensureStudentPortalSchema } from '@/lib/ensure-student-portal-schema'

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

    const { password } = await request.json()
    if (!password || String(password).length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 },
      )
    }

    await ensureStudentPortalSchema(db)

    const passwordHash = await bcrypt.hash(String(password), 10)
    const result = await db.query(
      `UPDATE students
       SET portal_password_hash = $1, portal_password_set_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND status = 'active'
       RETURNING id, admission_number`,
      [passwordHash, studentId],
    )

    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Parent portal password updated',
      data: result.rows[0],
    })
  } catch (error) {
    console.error('Set portal password error:', error)
    return NextResponse.json({ success: false, error: 'Failed to set password' }, { status: 500 })
  }
}

export async function DELETE(
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

    await ensureStudentPortalSchema(db)

    const result = await db.query(
      `UPDATE students
       SET portal_password_hash = NULL, portal_password_set_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [studentId],
    )

    if (!result.rows.length) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Portal password removed' })
  } catch (error) {
    console.error('Clear portal password error:', error)
    return NextResponse.json({ success: false, error: 'Failed to clear password' }, { status: 500 })
  }
}
