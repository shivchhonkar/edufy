import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, type JwtPayload } from '@edulakhya/auth';
import { AUTH_COOKIE_NAME } from '@/lib/auth-cookie';

export const PLATFORM_ADMIN_ROLE = 'platform_admin';

export function getTokenFromRequest(request: NextRequest): string | null {
  return (
    request.cookies.get(AUTH_COOKIE_NAME)?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    null
  );
}

export function isPlatformAdminPayload(payload: JwtPayload | null): payload is JwtPayload {
  return payload?.role === PLATFORM_ADMIN_ROLE;
}

export function requirePlatformAdmin(
  request: NextRequest,
): JwtPayload | NextResponse {
  const token = getTokenFromRequest(request);
  if (!token) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!isPlatformAdminPayload(payload)) {
    return NextResponse.json({ success: false, error: 'Platform admin access required' }, { status: 403 });
  }

  return payload;
}
