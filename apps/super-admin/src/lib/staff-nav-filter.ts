import type { PortalPermissionMap } from '@/lib/portal-access'

const FULL_ACCESS_ROLES = ['super_admin', 'admin', 'transport_manager']

export function hasFullStaffNavAccess(role?: string): boolean {
  return FULL_ACCESS_ROLES.includes(role || '')
}

export function canAccessStaffNavPath(
  path: string,
  permissions: PortalPermissionMap,
  options: { isAdmin: boolean; portalEnabled: boolean },
): boolean {
  if (options.isAdmin) return true

  const basePath = path.split('?')[0]

  if (basePath.startsWith('/transport')) {
    return options.portalEnabled && permissions.transport !== false
  }

  if (basePath.startsWith('/ess')) {
    return (
      options.portalEnabled &&
      ['attendance', 'leaves', 'payslips'].some((key) => permissions[key] !== false)
    )
  }

  return false
}

export function filterSidebarGroupsForStaffAccess<
  T extends { items: { path: string; comingSoon?: boolean }[] },
>(
  groups: T[],
  permissions: PortalPermissionMap,
  options: { isAdmin: boolean; portalEnabled: boolean },
): T[] {
  if (options.isAdmin) return groups

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.comingSoon
          ? false
          : canAccessStaffNavPath(item.path, permissions, options),
      ),
    }))
    .filter((group) => group.items.length > 0)
}
