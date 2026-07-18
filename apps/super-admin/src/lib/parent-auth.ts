import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function signParentToken(payload: {
  login: string;
  studentIds: number[];
  matchedStudentId?: number;
  tenant_id?: number;
  tenant_slug?: string;
  organization_id?: number;
  organization_slug?: string;
  school_code?: string;
}): string {
  return jwt.sign(
    {
      login: payload.login,
      studentIds: payload.studentIds,
      matchedStudentId: payload.matchedStudentId,
      role: 'parent' as const,
      user_type: 'parent' as const,
      tenant_id: payload.tenant_id,
      school_id: payload.tenant_id,
      tenant_slug: payload.tenant_slug,
      organization_id: payload.organization_id,
      organization_slug: payload.organization_slug,
      school_code: payload.school_code,
    },
    JWT_SECRET,
    { expiresIn: '7d' },
  );
}

export interface ParentSession {
  login?: string;
  phone?: string;
  studentIds: number[];
  role: 'parent';
  tenant_id?: number;
  organization_id?: number;
  school_code?: string;
}

export function getBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

export function verifyParentToken(token: string): ParentSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ParentSession & {
      tenant_id?: number;
      school_id?: number;
      organization_id?: number;
      school_code?: string;
    };
    if (decoded.role !== 'parent' || !Array.isArray(decoded.studentIds)) {
      return null;
    }
    return {
      ...decoded,
      tenant_id: decoded.tenant_id ?? decoded.school_id,
      organization_id: decoded.organization_id,
      school_code: decoded.school_code,
    };
  } catch {
    return null;
  }
}

export function getParentSession(request: NextRequest): ParentSession | null {
  const token = getBearerToken(request);
  if (!token) return null;
  return verifyParentToken(token);
}

export function parentCanAccessStudent(session: ParentSession, studentId: number): boolean {
  return session.studentIds.includes(studentId);
}

export function parseStudentIdParam(id: string): number | null {
  const parsed = parseInt(id, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function unauthorizedResponse() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
}

export function requireParentStudentAccess(
  request: NextRequest,
  studentId: number
): ParentSession | NextResponse {
  const session = getParentSession(request);
  if (!session) return unauthorizedResponse();
  if (!parentCanAccessStudent(session, studentId)) return forbiddenResponse();
  return session;
}

export function requireParentSession(request: NextRequest): ParentSession | NextResponse {
  const session = getParentSession(request);
  if (!session) return unauthorizedResponse();
  return session;
}
