import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { refreshPortalChildren } from '@/lib/parent-students'
import { getParentSession, unauthorizedResponse } from '@/lib/parent-auth'
import { getRequestDbOrError } from '@/lib/request-db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

type ParentTokenPayload = {
  login?: string
  studentIds: number[]
  role: 'parent'
}

export async function GET(request: NextRequest) {
  try {
    const session = getParentSession(request)
    if (!session) return unauthorizedResponse()

    const token = request.headers.get('authorization')?.slice(7)
    if (!token) return unauthorizedResponse()

    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    const decoded = jwt.verify(token, JWT_SECRET) as ParentTokenPayload
    const login = decoded.login || ''
    const children = await refreshPortalChildren(db, login, session.studentIds)

    if (children.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Portal access has been disabled for this account. Contact school administration.',
        },
        { status: 403 },
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        login,
        children,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Session refresh error:', error)
    return NextResponse.json(
      { success: false, error: `Failed to refresh session: ${message}` },
      { status: 500 },
    )
  }
}
