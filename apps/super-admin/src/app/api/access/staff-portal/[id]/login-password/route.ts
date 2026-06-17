import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDb } from '@/lib/request-db'
import {
  deactivateStaffLogin,
  upsertStaffLoginPassword,
} from '@/lib/staff-login-account'

function mapError(error: unknown) {
  const code = error instanceof Error ? error.message : ''
  switch (code) {
    case 'STAFF_NOT_FOUND':
      return NextResponse.json({ success: false, error: 'Staff not found' }, { status: 404 })
    case 'EMAIL_REQUIRED':
      return NextResponse.json(
        { success: false, error: 'Login email is required' },
        { status: 400 },
      )
    case 'PASSWORD_TOO_SHORT':
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 },
      )
    case 'EMAIL_IN_USE':
      return NextResponse.json(
        { success: false, error: 'This email is already linked to another staff member' },
        { status: 409 },
      )
    case 'ADMIN_EMAIL':
    case 'ADMIN_ACCOUNT':
      return NextResponse.json(
        { success: false, error: 'This email belongs to an administrator account' },
        { status: 409 },
      )
    default:
      return NextResponse.json({ success: false, error: 'Failed to update login password' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authResult = await getAuthenticatedDb(request)
    if (authResult instanceof NextResponse) return authResult
    const { db } = authResult

    const staffId = parseInt(params.id, 10)
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'Invalid staff id' }, { status: 400 })
    }

    const { password, email } = await request.json()
    if (!password) {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 })
    }

    const data = await upsertStaffLoginPassword(db, staffId, {
      email: email ? String(email) : undefined,
      password: String(password),
    })

    return NextResponse.json({
      success: true,
      message: 'Staff login password saved',
      data,
    })
  } catch (error) {
    console.error('Staff login password error:', error)
    return mapError(error)
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

    const staffId = parseInt(params.id, 10)
    if (!staffId) {
      return NextResponse.json({ success: false, error: 'Invalid staff id' }, { status: 400 })
    }

    await deactivateStaffLogin(db, staffId)

    return NextResponse.json({ success: true, message: 'Staff portal login disabled' })
  } catch (error) {
    console.error('Disable staff login error:', error)
    return mapError(error)
  }
}
