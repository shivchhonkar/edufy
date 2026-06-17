import { NextRequest, NextResponse } from 'next/server'
import { hasRole } from '@edulakhya/auth'
import { requireAuth, getStaffIdForUser } from '@/lib/api-auth'
import { getRequestDb } from '@/lib/request-db'
import {
  defaultStaffPermissions,
  type PortalPermissionMap,
} from '@/lib/portal-access'
import { getStaffPortalAccess } from '@/lib/staff-portal-access'

const FULL_ACCESS_ROLES = ['super_admin', 'admin', 'transport_manager']

async function resolveStaffId(
  db: Awaited<ReturnType<typeof getRequestDb>>['db'],
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

function allModulesEnabled(): PortalPermissionMap {
  return Object.fromEntries(
    Object.keys(defaultStaffPermissions()).map((key) => [key, true]),
  )
}

export async function GET(request: NextRequest) {
  try {
    const auth = requireAuth(request)
    if (auth instanceof NextResponse) return auth

    if (hasRole(auth.user.role || '', FULL_ACCESS_ROLES)) {
      return NextResponse.json({
        success: true,
        data: {
          is_admin: true,
          portal_access_enabled: true,
          effective_permissions: allModulesEnabled(),
        },
      })
    }

    const { db } = await getRequestDb(request)
    const staffId = await resolveStaffId(db, auth.user.id!)

    if (!staffId) {
      return NextResponse.json({
        success: true,
        data: {
          is_admin: false,
          portal_access_enabled: false,
          effective_permissions: {},
        },
      })
    }

    const access = await getStaffPortalAccess(db, staffId)
    return NextResponse.json({
      success: true,
      data: {
        is_admin: false,
        staff_id: staffId,
        portal_access_enabled: access.enabled,
        effective_permissions: access.permissions,
      },
    })
  } catch (error) {
    console.error('Staff portal me error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load staff access' },
      { status: 500 },
    )
  }
}
