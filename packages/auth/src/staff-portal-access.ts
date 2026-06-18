export const STAFF_ESS_MODULE_KEYS = ['attendance', 'leaves', 'payslips'] as const
export const STAFF_EXTERNAL_PORTAL_KEYS = ['transport', 'fees', 'inventory', 'teacher'] as const

export type StaffExternalPortalKey = (typeof STAFF_EXTERNAL_PORTAL_KEYS)[number]

export type PortalDb = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
}

export function defaultStaffPortalPermissions(): Record<string, boolean> {
  return {
    attendance: true,
    leaves: true,
    payslips: true,
    transport: false,
    fees: false,
    inventory: false,
    teacher: false,
  }
}

function permissionsFromDb(value: unknown): Record<string, boolean> | null {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, boolean>
}

function mergePermissions(
  defaults: Record<string, boolean>,
  overrides?: Record<string, boolean> | null,
): Record<string, boolean> {
  const merged = { ...defaults }
  if (!overrides) return merged
  for (const [key, value] of Object.entries(overrides)) {
    if (typeof value === 'boolean') merged[key] = value
  }
  return merged
}

async function ensureAccessColumns(db: PortalDb) {
  await db.query(`
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS portal_access_enabled BOOLEAN DEFAULT true;
    ALTER TABLE staff ADD COLUMN IF NOT EXISTS portal_permissions JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS staff_portal_defaults JSONB DEFAULT '{}'::jsonb;
  `)
}

async function resolveStaffId(db: PortalDb, userId: number): Promise<number | null> {
  const byUserId = await db.query('SELECT id FROM staff WHERE user_id = $1 LIMIT 1', [userId])
  if (byUserId.rows[0]?.id) return Number(byUserId.rows[0].id)

  const byEmail = await db.query(
    `SELECT s.id FROM staff s
     JOIN users u ON LOWER(COALESCE(s.email, '')) = LOWER(u.email)
     WHERE u.id = $1 LIMIT 1`,
    [userId],
  )
  if (byEmail.rows[0]?.id) return Number(byEmail.rows[0].id)
  return null
}

export async function staffCanAccessPortalModule(
  db: PortalDb,
  userId: number,
  moduleKey: string,
): Promise<boolean> {
  await ensureAccessColumns(db)

  const staffId = await resolveStaffId(db, userId)
  if (!staffId) return false

  const settingsRes = await db.query(
    `SELECT staff_portal_defaults FROM system_settings ORDER BY id DESC LIMIT 1`,
  )
  const defaults = mergePermissions(
    defaultStaffPortalPermissions(),
    permissionsFromDb(settingsRes.rows[0]?.staff_portal_defaults),
  )

  const staffRes = await db.query(
    `SELECT portal_access_enabled, portal_permissions FROM staff WHERE id = $1`,
    [staffId],
  )
  const row = staffRes.rows[0]
  if (row?.portal_access_enabled === false) return false

  const permissions = mergePermissions(defaults, permissionsFromDb(row?.portal_permissions))
  return permissions[moduleKey] !== false
}

export type PortalLoginModule = StaffExternalPortalKey

export const PORTAL_LOGIN_PRIVILEGED_ROLES: Record<PortalLoginModule, string[]> = {
  transport: ['super_admin', 'admin', 'transport_manager'],
  fees: ['super_admin', 'admin'],
  inventory: ['super_admin', 'admin', 'inventory_manager'],
  teacher: ['super_admin', 'admin', 'teacher'],
}
