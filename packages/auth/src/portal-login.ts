import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {
  staffCanAccessPortalModule,
  PORTAL_LOGIN_PRIVILEGED_ROLES,
  type PortalDb,
  type PortalLoginModule,
} from './staff-portal-access'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRY = '7d'

export async function authenticateStaffPortalLogin(
  db: PortalDb,
  email: string,
  password: string,
  moduleKey: PortalLoginModule,
): Promise<
  | { success: true; user: Record<string, unknown>; token: string }
  | { success: false; error: string; status: number }
> {
  if (!email?.trim() || !password) {
    return { success: false, error: 'Email and password are required', status: 400 }
  }

  const userResult = await db.query(
    `SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND is_active = true`,
    [email.trim()],
  )

  if (!userResult.rows.length) {
    return {
      success: false,
      error: 'Invalid credentials or unauthorized access',
      status: 401,
    }
  }

  const user = userResult.rows[0]
  const passwordHash = String(user.password_hash || '')
  const isPasswordValid = await bcrypt.compare(password, passwordHash)

  if (!isPasswordValid) {
    return { success: false, error: 'Invalid credentials', status: 401 }
  }

  const role = String(user.role || '')
  const privilegedRoles = PORTAL_LOGIN_PRIVILEGED_ROLES[moduleKey]

  if (!privilegedRoles.includes(role)) {
    const allowed = await staffCanAccessPortalModule(db, Number(user.id), moduleKey)
    if (!allowed) {
      return {
        success: false,
        error:
          'You do not have permission to access this portal. Contact school administration.',
        status: 403,
      }
    }
  }

  const { password_hash: _omit, ...userWithoutPassword } = user
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY },
  )

  return {
    success: true,
    user: userWithoutPassword,
    token,
  }
}
