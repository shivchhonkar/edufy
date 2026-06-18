export const PARENT_PORTAL_MODULES = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { key: 'profile', label: 'Profile', pathPrefix: '/profile' },
  { key: 'homework', label: 'Homework', pathPrefix: '/homework' },
  { key: 'fees', label: 'Fees', pathPrefix: '/fees' },
  { key: 'attendance', label: 'Attendance', pathPrefix: '/attendance' },
  { key: 'calendar', label: 'Calendar', path: '/calendar' },
  { key: 'results', label: 'Results', path: '/results' },
  { key: 'report_card', label: 'Report Card', pathPrefix: '/grades' },
] as const

export type PortalPermissionMap = Record<string, boolean>

export function defaultParentPermissions(): PortalPermissionMap {
  return Object.fromEntries(PARENT_PORTAL_MODULES.map((m) => [m.key, true]))
}

export function mergePermissions(
  defaults: PortalPermissionMap,
  overrides?: PortalPermissionMap | null,
): PortalPermissionMap {
  const merged = { ...defaults }
  if (!overrides) return merged
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === 'boolean') merged[key] = value
  }
  return merged
}

export function isModuleAllowed(permissions: PortalPermissionMap, key: string): boolean {
  return permissions[key] !== false
}
