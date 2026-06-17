import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '@edulakhya/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = '7d';

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Verify password
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT payload includes tenant_id for multi-tenant (separate DB per school)
export interface JwtPayload {
  id: number;
  email: string;
  role: User['role'];
  full_name: string;
  tenant_id?: number;
  tenant_slug?: string;
}

// Generate JWT token (include tenant_id when in multi-tenant mode)
export function generateToken(
  user: Partial<User> & { tenant_id?: number; tenant_slug?: string }
): string {
  const payload: JwtPayload = {
    id: user.id!,
    email: user.email!,
    role: user.role!,
    full_name: user.full_name!,
  };
  if (user.tenant_id != null) payload.tenant_id = user.tenant_id;
  if (user.tenant_slug) payload.tenant_slug = user.tenant_slug;

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Decode JWT token without verification
export function decodeToken(token: string): any {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

// Check if user has required role
export function hasRole(
  userRole: string,
  requiredRoles: string[]
): boolean {
  return requiredRoles.includes(userRole);
}

// Middleware to check authentication
export function isAuthenticated(token: string | undefined): boolean {
  if (!token) return false;
  const decoded = verifyToken(token);
  return !!decoded;
}

// Get user from token (includes tenant_id / tenant_slug when present)
export function getUserFromToken(token: string): (Partial<User> & { tenant_id?: number; tenant_slug?: string }) | null {
  const decoded = verifyToken(token) as JwtPayload | null;
  if (!decoded) return null;

  const out: Partial<User> & { tenant_id?: number; tenant_slug?: string } = {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    full_name: decoded.full_name,
  };
  if (decoded.tenant_id != null) out.tenant_id = decoded.tenant_id;
  if (decoded.tenant_slug) out.tenant_slug = decoded.tenant_slug;
  return out;
}

export {
  defaultStaffPortalPermissions,
  staffCanAccessPortalModule,
  STAFF_ESS_MODULE_KEYS,
  STAFF_EXTERNAL_PORTAL_KEYS,
  PORTAL_LOGIN_PRIVILEGED_ROLES,
} from './staff-portal-access';
export type { PortalLoginModule, StaffExternalPortalKey } from './staff-portal-access';
export { authenticateStaffPortalLogin } from './portal-login';

