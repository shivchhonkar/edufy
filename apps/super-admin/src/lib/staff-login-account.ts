import bcrypt from 'bcryptjs'
import type { RequestDb } from '@/lib/request-db'

export type StaffLoginRow = {
  id: number
  user_id: number | null
  email: string | null
  first_name: string
  last_name: string
  phone: string | null
}

const ADMIN_ROLES = new Set(['super_admin', 'admin'])

export async function getStaffForLogin(db: RequestDb, staffId: number): Promise<StaffLoginRow | null> {
  const result = await db.query(
    `SELECT id, user_id, email, first_name, last_name, phone
     FROM staff WHERE id = $1 AND status = 'active'`,
    [staffId],
  )
  return (result.rows[0] as StaffLoginRow | undefined) ?? null
}

export async function upsertStaffLoginPassword(
  db: RequestDb,
  staffId: number,
  input: { email?: string; password: string },
): Promise<{ login_email: string; has_login_password: true }> {
  const staff = await getStaffForLogin(db, staffId)
  if (!staff) {
    throw new Error('STAFF_NOT_FOUND')
  }

  const loginEmail = (input.email?.trim() || staff.email?.trim() || '').toLowerCase()
  if (!loginEmail) {
    throw new Error('EMAIL_REQUIRED')
  }

  if (input.password.length < 6) {
    throw new Error('PASSWORD_TOO_SHORT')
  }

  const passwordHash = await bcrypt.hash(input.password, 10)
  const fullName = `${staff.first_name} ${staff.last_name}`.trim()

  let userId = staff.user_id

  if (userId) {
    const userCheck = await db.query(`SELECT id, role FROM users WHERE id = $1`, [userId])
    if (!userCheck.rows.length) {
      userId = null
    } else if (ADMIN_ROLES.has(String(userCheck.rows[0].role))) {
      throw new Error('ADMIN_ACCOUNT')
    }
  }

  if (!userId) {
    const existing = await db.query(
      `SELECT u.id, u.role, s.id AS linked_staff_id
       FROM users u
       LEFT JOIN staff s ON s.user_id = u.id AND s.id <> $2
       WHERE LOWER(u.email) = LOWER($1)
       LIMIT 1`,
      [loginEmail, staffId],
    )

    if (existing.rows.length) {
      const row = existing.rows[0] as { id: number; role: string; linked_staff_id: number | null }
      if (row.linked_staff_id) {
        throw new Error('EMAIL_IN_USE')
      }
      if (ADMIN_ROLES.has(row.role)) {
        throw new Error('ADMIN_EMAIL')
      }
      userId = Number(row.id)
    }
  }

  if (userId) {
    await db.query(
      `UPDATE users
       SET email = $1, password_hash = $2, full_name = $3, phone = COALESCE($4, phone),
           is_active = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [loginEmail, passwordHash, fullName, staff.phone, userId],
    )
  } else {
    const inserted = await db.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone, is_active, created_at, updated_at)
       VALUES ($1, $2, 'teacher', $3, $4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [loginEmail, passwordHash, fullName, staff.phone || ''],
    )
    userId = Number(inserted.rows[0].id)
  }

  await db.query(
    `UPDATE staff SET user_id = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
    [userId, loginEmail, staffId],
  )

  return { login_email: loginEmail, has_login_password: true }
}

export async function deactivateStaffLogin(db: RequestDb, staffId: number): Promise<void> {
  const staff = await getStaffForLogin(db, staffId)
  if (!staff) {
    throw new Error('STAFF_NOT_FOUND')
  }

  if (staff.user_id) {
    await db.query(
      `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [staff.user_id],
    )
    return
  }

  if (staff.email) {
    await db.query(
      `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(email) = LOWER($1) AND role = 'teacher'`,
      [staff.email],
    )
  }
}
