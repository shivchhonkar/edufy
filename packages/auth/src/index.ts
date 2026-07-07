import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '@edulakhya/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = '7d';

export type AuthUserType = 'school_local' | 'organization' | 'parent';

export interface JwtPayload {
  id: number;
  email: string;
  role: string;
  full_name: string;
  user_type?: AuthUserType;
  organization_id?: number;
  organization_slug?: string;
  /** Active school (campus) — legacy name kept for compatibility */
  tenant_id?: number;
  tenant_slug?: string;
  school_id?: number;
  school_slug?: string;
  accessible_school_ids?: number[];
}

export type TokenInput = Omit<Partial<User>, 'role'> & {
  user_type?: AuthUserType;
  organization_id?: number;
  organization_slug?: string;
  tenant_id?: number;
  tenant_slug?: string;
  school_id?: number;
  school_slug?: string;
  accessible_school_ids?: number[];
  role?: string;
};

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user: TokenInput): string {
  const schoolId = user.school_id ?? user.tenant_id;
  const schoolSlug = user.school_slug ?? user.tenant_slug;

  const payload: JwtPayload = {
    id: user.id!,
    email: user.email!,
    role: user.role!,
    full_name: user.full_name!,
  };

  if (user.user_type) payload.user_type = user.user_type;
  if (user.organization_id != null) payload.organization_id = user.organization_id;
  if (user.organization_slug) payload.organization_slug = user.organization_slug;
  if (schoolId != null) {
    payload.tenant_id = schoolId;
    payload.school_id = schoolId;
  }
  if (schoolSlug) {
    payload.tenant_slug = schoolSlug;
    payload.school_slug = schoolSlug;
  }
  if (user.accessible_school_ids?.length) {
    payload.accessible_school_ids = user.accessible_school_ids;
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload | null;
  } catch {
    return null;
  }
}

export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

export function isAuthenticated(token: string | undefined): boolean {
  if (!token) return false;
  return !!verifyToken(token);
}

export function getUserFromToken(token: string): TokenInput | null {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  return {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    full_name: decoded.full_name,
    user_type: decoded.user_type,
    organization_id: decoded.organization_id,
    organization_slug: decoded.organization_slug,
    tenant_id: decoded.tenant_id ?? decoded.school_id,
    tenant_slug: decoded.tenant_slug ?? decoded.school_slug,
    school_id: decoded.school_id ?? decoded.tenant_id,
    school_slug: decoded.school_slug ?? decoded.tenant_slug,
    accessible_school_ids: decoded.accessible_school_ids,
  };
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
