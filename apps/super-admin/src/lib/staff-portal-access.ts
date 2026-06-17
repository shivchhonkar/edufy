import type { RequestDb } from '@/lib/request-db'
import {
  defaultStaffPermissions,
  mergePermissions,
  permissionsFromDb,
  type PortalPermissionMap,
} from '@/lib/portal-access'
import { ensureAccessSchema, getSystemSettingsRow } from '@/lib/ensure-access-schema'

export type StaffPortalAccess = {
  enabled: boolean
  permissions: PortalPermissionMap
}

export async function getStaffPortalDefaults(db: RequestDb): Promise<PortalPermissionMap> {
  await ensureAccessSchema(db)
  const settings = await getSystemSettingsRow(db)
  return mergePermissions(
    defaultStaffPermissions(),
    permissionsFromDb(settings?.staff_portal_defaults),
  )
}

export async function getStaffPortalAccess(
  db: RequestDb,
  staffId: number,
): Promise<StaffPortalAccess> {
  await ensureAccessSchema(db)
  const defaults = await getStaffPortalDefaults(db)
  const result = await db.query(
    `SELECT portal_access_enabled, portal_permissions FROM staff WHERE id = $1`,
    [staffId],
  )
  const row = result.rows[0] as
    | { portal_access_enabled: boolean | null; portal_permissions: unknown }
    | undefined
  if (!row) {
    return { enabled: false, permissions: defaults }
  }
  return {
    enabled: row.portal_access_enabled !== false,
    permissions: mergePermissions(defaults, permissionsFromDb(row.portal_permissions)),
  }
}

export function isStaffModuleAllowed(access: StaffPortalAccess, moduleKey: string): boolean {
  if (!access.enabled) return false
  return access.permissions[moduleKey] !== false
}
