import { NextRequest, NextResponse } from 'next/server'
import { authenticateStaffPortalLogin } from '@edulakhya/auth'
import { getRequestDbOrError } from '@/lib/request-db'

export async function POST(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    const body = await request.json()
    const result = await authenticateStaffPortalLogin(
      db,
      body.email,
      body.password,
      'teacher',
    )

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      )
    }

    return NextResponse.json({
      success: true,
      data: { user: result.user, token: result.token },
      message: 'Login successful',
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
