import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken, hasRole, verifyToken } from '@edulakhya/auth';

export type AuthUser = NonNullable<ReturnType<typeof getUserFromToken>> & {
  id: number;
  tenant_id?: number;
  tenant_slug?: string;
};

/** API routes that do not require authentication */
export const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/platform/schools/register',
  '/api/platform/schools/check-slug',
  '/api/marksheets/verify',
] as const;

/** Dangerous admin/setup routes — super_admin only */
export const SUPER_ADMIN_API_PATHS = [
  '/api/add-subject-column',
  '/api/setup-exams',
  '/api/setup-subjects',
  '/api/fix-exams',
  '/api/check-exams-table',
  '/api/migrate-attendance',
  '/api/system/optimize',
  '/api/system/performance',
  '/api/settings/initialize-system',
  '/api/auth/register',
] as const;

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));
}

export function isSuperAdminApiPath(pathname: string): boolean {
  return SUPER_ADMIN_API_PATHS.some((p) => pathname.startsWith(p));
}

export function getTokenFromRequest(request: NextRequest): string | null {
  return (
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    null
  );
}

/** Decode JWT role from token (middleware-safe, no bcrypt) */
export function getRoleFromToken(token: string): string | null {
  const decoded = verifyToken(token) as { role?: string } | null;
  return decoded?.role ?? null;
}

export function requireAuth(
  request: NextRequest
): { user: AuthUser } | NextResponse {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }
  const user = getUserFromToken(token);
  if (!user?.id) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
  return { user: user as AuthUser };
}

export function requireSuperAdmin(
  request: NextRequest
): { user: AuthUser } | NextResponse {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!hasRole(auth.user.role || '', ['super_admin'])) {
    return NextResponse.json(
      { success: false, error: 'Super admin access required' },
      { status: 403 }
    );
  }
  return auth;
}

export const HR_ADMIN_ROLES = ['super_admin', 'admin'];
export const HR_READ_ROLES = ['super_admin', 'admin', 'teacher'];

export function requireHrAdmin(
  request: NextRequest
): { user: AuthUser } | NextResponse {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!hasRole(auth.user.role || '', HR_ADMIN_ROLES)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  return auth;
}

export function requireHrRead(
  request: NextRequest
): { user: AuthUser } | NextResponse {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!hasRole(auth.user.role || '', HR_READ_ROLES)) {
    return NextResponse.json(
      { success: false, error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  return auth;
}

export async function getStaffIdForUser(
  db: { query: (text: string, params?: unknown[]) => Promise<{ rows: { id: number }[] }> },
  userId: number
): Promise<number | null> {
  const result = await db.query('SELECT id FROM staff WHERE user_id = $1 LIMIT 1', [userId]);
  return result.rows[0]?.id ?? null;
}
