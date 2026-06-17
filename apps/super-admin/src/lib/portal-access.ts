import { defaultStaffPortalPermissions } from '@edulakhya/auth'

export const PARENT_PORTAL_MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'profile', label: 'Profile' },
  { key: 'homework', label: 'Homework' },
  { key: 'fees', label: 'Fees' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'results', label: 'Results' },
  { key: 'report_card', label: 'Report Card' },
] as const

export const STAFF_ESS_MODULES = [
  { key: 'attendance', label: 'ESS — Attendance' },
  { key: 'leaves', label: 'ESS — Leaves' },
  { key: 'payslips', label: 'ESS — Payslips' },
] as const

export const STAFF_EXTERNAL_PORTALS = [
  {
    key: 'transport',
    label: 'Transport Portal',
    port: 7002,
    path: '/login',
    description: 'Manage routes, vehicles, drivers, and student transport',
  },
  {
    key: 'fees',
    label: 'Fees Management',
    port: 7003,
    path: '/',
    description: 'Collect fees, record payments, and print receipts',
  },
  {
    key: 'inventory',
    label: 'Inventory Portal',
    port: 7004,
    path: '/login',
    description: 'Manage stock, sales, and inventory transactions',
  },
] as const

export const STAFF_PORTAL_MODULES = [...STAFF_ESS_MODULES, ...STAFF_EXTERNAL_PORTALS] as const

export type ParentPortalModuleKey = (typeof PARENT_PORTAL_MODULES)[number]['key']
export type StaffPortalModuleKey = (typeof STAFF_PORTAL_MODULES)[number]['key']

export type PortalPermissionMap = Record<string, boolean>

export function defaultParentPermissions(): PortalPermissionMap {
  return Object.fromEntries(PARENT_PORTAL_MODULES.map((m) => [m.key, true]))
}

export function defaultStaffPermissions(): PortalPermissionMap {
  return { ...defaultStaffPortalPermissions() }
}

export function buildStaffPortalUrl(
  portal: (typeof STAFF_EXTERNAL_PORTALS)[number],
  hostname?: string,
): string {
  const host = hostname || (typeof window !== 'undefined' ? window.location.hostname : 'global.localhost')
  const parts = host.split('.')
  const subdomain =
    parts.length >= 2 && parts[parts.length - 1] === 'localhost' ? parts[0] : 'global'
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:'
  return `${protocol}//${subdomain}.localhost:${portal.port}${portal.path}`
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

export function permissionsFromDb(value: unknown): PortalPermissionMap | null {
  if (!value || typeof value !== 'object') return null
  return value as PortalPermissionMap
}

export function staffPortalSummary(permissions: PortalPermissionMap): string {
  const enabled = STAFF_EXTERNAL_PORTALS.filter((p) => permissions[p.key] !== false).map(
    (p) => p.label,
  )
  return enabled.length ? enabled.join(', ') : 'None'
}
