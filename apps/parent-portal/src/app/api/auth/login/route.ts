import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import {
  fetchChildrenByIds,
  findPortalLoginCandidates,
  resolvePortalChildrenIds,
  verifyPortalPassword,
} from '@/lib/parent-students'
import { getRequestDbOrError } from '@/lib/request-db'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this'

export async function POST(request: NextRequest) {
  try {
    const dbResult = await getRequestDbOrError(request)
    if (dbResult instanceof NextResponse) return dbResult
    const { db } = dbResult

    const body = await request.json()
    const login = String(body.login || body.phone || '').trim()
    const { password } = body

    if (!login || !password) {
      return NextResponse.json(
        { success: false, error: 'Student ID or phone number and password are required' },
        { status: 400 },
      )
    }

    const candidates = await findPortalLoginCandidates(db, login)
    if (candidates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No student found for this Student ID or phone number' },
        { status: 401 },
      )
    }

    const matched = await verifyPortalPassword(candidates, password)
    if (!matched) {
      const hasAnyPassword = candidates.some((c) => c.portal_password_hash)
      return NextResponse.json(
        {
          success: false,
          error: hasAnyPassword
            ? 'Invalid password. Contact school administration if you need access.'
            : 'Portal password is not set for this account. Contact school administration.',
        },
        { status: 401 },
      )
    }

    const studentIds = await resolvePortalChildrenIds(db, matched)
    const children = await fetchChildrenByIds(db, studentIds)

    if (children.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Portal access has been disabled for this account. Contact school administration.',
        },
        { status: 403 },
      )
    }

    const token = jwt.sign(
      {
        login,
        studentIds: children.map((c) => c.id),
        matchedStudentId: matched.id,
        role: 'parent',
      },
      JWT_SECRET,
      { expiresIn: '7d' },
    )

    return NextResponse.json({
      success: true,
      token,
      user: {
        login,
        children,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: `An error occurred during login: ${message}` },
      { status: 500 },
    )
  }
}
