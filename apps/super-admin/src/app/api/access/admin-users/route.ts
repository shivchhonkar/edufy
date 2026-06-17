import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedDb } from '@/lib/request-db'
import { ensureAccessSchema } from '@/lib/ensure-access-schema'

export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedDb(request)
    if (authResult instanceof NextResponse) return authResult
    const { db } = authResult

    await ensureAccessSchema(db)

    const result = await db.query(
      `SELECT id, email, full_name AS name, role, phone, is_active AS status, created_at, updated_at
       FROM users
       WHERE role IN ('admin', 'super_admin')
       ORDER BY full_name, email`,
    )

    const users = result.rows.map((user: Record<string, unknown>) => ({
      ...user,
      username: String(user.email || '').split('@')[0],
      status: user.status ? 'active' : 'inactive',
    }))

    return NextResponse.json({ success: true, data: users })
  } catch (error) {
    console.error('Admin access list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch administrators' }, { status: 500 })
  }
}
