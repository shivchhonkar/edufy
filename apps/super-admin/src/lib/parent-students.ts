import bcrypt from 'bcryptjs'
import type { RequestDb } from '@/lib/request-db'
import {
  defaultParentPermissions,
  mergePermissions,
  type PortalPermissionMap,
} from '@/lib/portal-access'

const CHILDREN_SELECT = `
  SELECT DISTINCT ON (s.id)
    s.id,
    s.first_name,
    s.middle_name,
    s.last_name,
    s.admission_number,
    COALESCE(s.roll_number, e.roll_number) AS roll_number,
    s.gender,
    s.date_of_birth,
    s.blood_group,
    s.photo_url,
    s.status,
    COALESCE(s.portal_access_enabled, true) AS portal_access_enabled,
    s.portal_permissions,
    COALESCE(sc.name, ec.name) AS class_name,
    COALESCE(ss.name, es.name) AS section_name,
    COALESCE(e.academic_year, '') AS current_academic_year
  FROM students s
  LEFT JOIN student_enrollments e ON e.student_id = s.id AND e.is_current = true
  LEFT JOIN classes sc ON s.class_id = sc.id
  LEFT JOIN sections ss ON s.section_id = ss.id
  LEFT JOIN classes ec ON e.class_id = ec.id
  LEFT JOIN sections es ON e.section_id = es.id
`

export async function resolveParentStudentIds(db: RequestDb, phone: string): Promise<number[]> {
  const ids = new Set<number>()
  const normalizedPhone = phone.replace(/\D/g, '')

  if (!normalizedPhone) return []

  try {
    const guardianResult = await db.query<{ student_id: number }>(
      `SELECT DISTINCT student_id FROM student_guardians
       WHERE regexp_replace(COALESCE(mobile, ''), '\\D', '', 'g') = $1
          OR regexp_replace(COALESCE(alternate_mobile, ''), '\\D', '', 'g') = $1`,
      [normalizedPhone],
    )
    guardianResult.rows.forEach((row) => ids.add(row.student_id))
  } catch {
    // student_guardians may not exist on older DBs
  }

  const legacyResult = await db.query<{ id: number }>(
    `SELECT id FROM students
     WHERE regexp_replace(COALESCE(parent_phone, ''), '\\D', '', 'g') = $1
       AND status = 'active'`,
    [normalizedPhone],
  )
  legacyResult.rows.forEach((row) => ids.add(row.id))

  return Array.from(ids)
}

type PortalCandidate = {
  id: number
  portal_password_hash: string | null
  parent_phone: string | null
}

async function ensurePortalColumns(db: RequestDb) {
  await db.query(`
    ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_password_hash VARCHAR(255);
    ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_password_set_at TIMESTAMP;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_access_enabled BOOLEAN DEFAULT true;
    ALTER TABLE students ADD COLUMN IF NOT EXISTS portal_permissions JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS parent_portal_defaults JSONB DEFAULT '{}'::jsonb;
  `)
}

function permissionsFromDb(value: unknown): PortalPermissionMap | null {
  if (!value || typeof value !== 'object') return null
  return value as PortalPermissionMap
}

export type PortalChild = {
  id: number
  first_name: string
  middle_name?: string | null
  last_name: string
  admission_number: string
  roll_number?: string | null
  gender?: string | null
  date_of_birth?: string | null
  blood_group?: string | null
  photo_url?: string | null
  status: string
  class_name?: string | null
  section_name?: string | null
  current_academic_year?: string | null
  portal_access_enabled: boolean
  effective_permissions: PortalPermissionMap
}

async function getParentPortalDefaults(db: RequestDb): Promise<PortalPermissionMap> {
  await ensurePortalColumns(db)
  const result = await db.query<{ parent_portal_defaults?: unknown }>(
    `SELECT parent_portal_defaults FROM system_settings ORDER BY id DESC LIMIT 1`,
  )
  const raw = result.rows[0]?.parent_portal_defaults
  return mergePermissions(defaultParentPermissions(), permissionsFromDb(raw))
}

function withEffectivePermissions(
  row: Record<string, unknown>,
  defaults: PortalPermissionMap,
): PortalChild {
  const enabled = row.portal_access_enabled !== false
  const effective_permissions = mergePermissions(
    defaults,
    permissionsFromDb(row.portal_permissions),
  )
  const { portal_permissions: _omit, ...rest } = row
  return { ...rest, portal_access_enabled: enabled, effective_permissions } as PortalChild
}

export async function findPortalLoginCandidates(
  db: RequestDb,
  login: string,
): Promise<PortalCandidate[]> {
  await ensurePortalColumns(db)
  const trimmed = login.trim()
  if (!trimmed) return []

  const byAdmission = await db.query<PortalCandidate>(
    `SELECT id, portal_password_hash, parent_phone
     FROM students
     WHERE LOWER(admission_number) = LOWER($1) AND status = 'active'`,
    [trimmed],
  )
  if (byAdmission.rows.length) {
    return byAdmission.rows
  }

  const phoneIds = await resolveParentStudentIds(db, trimmed)
  if (!phoneIds.length) return []

  const byPhone = await db.query<PortalCandidate>(
    `SELECT id, portal_password_hash, parent_phone
     FROM students
     WHERE id = ANY($1::int[]) AND status = 'active'`,
    [phoneIds],
  )
  return byPhone.rows
}

export async function verifyPortalPassword(
  candidates: PortalCandidate[],
  password: string,
): Promise<PortalCandidate | null> {
  for (const candidate of candidates) {
    if (!candidate.portal_password_hash) continue
    const match = await bcrypt.compare(password, candidate.portal_password_hash)
    if (match) return candidate
  }
  return null
}

export async function resolvePortalChildrenIds(
  db: RequestDb,
  matched: PortalCandidate,
): Promise<number[]> {
  if (matched.parent_phone) {
    const siblingIds = await resolveParentStudentIds(db, matched.parent_phone)
    if (siblingIds.length) return siblingIds
  }
  return [matched.id]
}

export async function resolvePortalChildrenForLogin(
  db: RequestDb,
  login: string,
  fallbackIds: number[],
): Promise<number[]> {
  const trimmed = login.trim()
  if (!trimmed) return fallbackIds

  const candidates = await findPortalLoginCandidates(db, trimmed)
  if (!candidates.length) return fallbackIds

  const idSet = new Set<number>()
  for (const candidate of candidates) {
    const ids = await resolvePortalChildrenIds(db, candidate)
    ids.forEach((id) => idSet.add(id))
  }
  return Array.from(idSet)
}

export async function refreshPortalChildren(
  db: RequestDb,
  login: string,
  fallbackIds: number[],
): Promise<PortalChild[]> {
  const studentIds = await resolvePortalChildrenForLogin(db, login, fallbackIds)
  return fetchChildrenByIds(db, studentIds)
}

export async function fetchChildrenByIds(db: RequestDb, studentIds: number[]): Promise<PortalChild[]> {
  if (studentIds.length === 0) return []

  await ensurePortalColumns(db)
  const defaults = await getParentPortalDefaults(db)

  const result = await db.query<Record<string, unknown>>(
    `${CHILDREN_SELECT}
     WHERE s.id = ANY($1::int[]) AND s.status = 'active'
     ORDER BY s.id, s.first_name, s.last_name`,
    [studentIds],
  )

  return result.rows
    .map((row) => withEffectivePermissions(row, defaults))
    .filter((child) => child.portal_access_enabled)
}
