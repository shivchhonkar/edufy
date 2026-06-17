import { NextRequest, NextResponse } from 'next/server'
import { hasRole } from '@edulakhya/auth'
import { requireAuth, getStaffIdForUser, type AuthUser } from '@/lib/api-auth'
import { getRequestDb, type RequestDb } from '@/lib/request-db'
import { getStaffPortalAccess, isStaffModuleAllowed } from '@/lib/staff-portal-access'

const TRANSPORT_BYPASS_ROLES = ['super_admin', 'admin', 'transport_manager']

async function resolveStaffId(
  db: RequestDb,
  userId: number,
): Promise<number | null> {
  let staffId = await getStaffIdForUser(db, userId)
  if (staffId) return staffId
  const byEmail = await db.query(
    `SELECT s.id FROM staff s JOIN users u ON LOWER(s.email) = LOWER(u.email) WHERE u.id = $1 LIMIT 1`,
    [userId],
  )
  return byEmail.rows[0]?.id ?? null
}

export type TransportAccessResult =
  | { ok: true; db: RequestDb; user: AuthUser }
  | { ok: false; response: NextResponse }

export async function withTransportAccess(
  request: NextRequest,
): Promise<TransportAccessResult> {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) {
    return { ok: false, response: auth }
  }

  const { db } = await getRequestDb(request)

  if (hasRole(auth.user.role || '', TRANSPORT_BYPASS_ROLES)) {
    return { ok: true, db, user: auth.user }
  }

  const staffId = await resolveStaffId(db, auth.user.id!)
  if (!staffId) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Transport access not enabled for your account' },
        { status: 403 },
      ),
    }
  }

  const access = await getStaffPortalAccess(db, staffId)
  if (!isStaffModuleAllowed(access, 'transport')) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Transport access not enabled for your account' },
        { status: 403 },
      ),
    }
  }

  return { ok: true, db, user: auth.user }
}
